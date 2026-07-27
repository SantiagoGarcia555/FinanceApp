using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using FinanceApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TransactionsController(AppDbContext db, IEnumerable<ITransactionFileParser> fileParsers) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("Token sin claim 'sub'."));

    [HttpGet]
    public async Task<ActionResult<PagedResult<TransactionResponse>>> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? accountId,
        [FromQuery] decimal? minAmount,
        [FromQuery] decimal? maxAmount,
        [FromQuery] string? type, // "income" | "expense"
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Transactions.Where(t => t.UserId == CurrentUserId);

        if (from is not null)
            query = query.Where(t => t.Date >= from.Value);

        if (to is not null)
            query = query.Where(t => t.Date <= to.Value);

        if (categoryId is not null)
            query = query.Where(t => t.CategoryId == categoryId);

        if (accountId is not null)
            query = query.Where(t => t.AccountId == accountId);

        if (minAmount is not null)
            query = query.Where(t => t.Amount >= minAmount);

        if (maxAmount is not null)
            query = query.Where(t => t.Amount <= maxAmount);

        if (type == "income")
            query = query.Where(t => t.Amount > 0);
        else if (type == "expense")
            query = query.Where(t => t.Amount < 0);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ProjectToResponse)
            .ToListAsync();

        return new PagedResult<TransactionResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
        };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionResponse>> GetById(Guid id)
    {
        var response = await db.Transactions
            .Where(t => t.Id == id && t.UserId == CurrentUserId)
            .Select(ProjectToResponse)
            .SingleOrDefaultAsync();

        return response is null ? NotFound() : response;
    }

    [HttpPost]
    public async Task<ActionResult<TransactionResponse>> Create(TransactionRequest request)
    {
        if (request.Amount == 0)
            return BadRequest("El monto no puede ser cero.");

        if (string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("La descripción es obligatoria.");

        var accountId = request.AccountId ?? await GetOrCreateDefaultAccountIdAsync();

        if (!await db.Accounts.AnyAsync(a => a.Id == accountId && a.UserId == CurrentUserId))
            return BadRequest("La cuenta indicada no existe o no te pertenece.");

        if (request.CategoryId is not null && !await IsValidCategoryAsync(request.CategoryId.Value))
            return BadRequest("La categoría indicada no existe o no te pertenece.");

        var transaction = new Transaction
        {
            UserId = CurrentUserId,
            AccountId = accountId,
            CategoryId = request.CategoryId,
            Amount = request.Amount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "COP" : request.Currency,
            Description = request.Description,
            Date = request.Date,
            Source = TransactionSource.Manual,
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        var response = await db.Transactions
            .Where(t => t.Id == transaction.Id)
            .Select(ProjectToResponse)
            .SingleAsync();

        return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TransactionResponse>> Update(Guid id, TransactionRequest request)
    {
        var transaction = await db.Transactions
            .SingleOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);

        if (transaction is null)
            return NotFound();

        if (request.Amount == 0)
            return BadRequest("El monto no puede ser cero.");

        if (string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("La descripción es obligatoria.");

        var accountId = request.AccountId ?? transaction.AccountId;

        if (!await db.Accounts.AnyAsync(a => a.Id == accountId && a.UserId == CurrentUserId))
            return BadRequest("La cuenta indicada no existe o no te pertenece.");

        if (request.CategoryId is not null && !await IsValidCategoryAsync(request.CategoryId.Value))
            return BadRequest("La categoría indicada no existe o no te pertenece.");

        transaction.AccountId = accountId;
        transaction.CategoryId = request.CategoryId;
        transaction.Amount = request.Amount;
        transaction.Currency = string.IsNullOrWhiteSpace(request.Currency) ? transaction.Currency : request.Currency;
        transaction.Description = request.Description;
        transaction.Date = request.Date;

        await db.SaveChangesAsync();

        return await db.Transactions
            .Where(t => t.Id == id)
            .Select(ProjectToResponse)
            .SingleAsync();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var transaction = await db.Transactions
            .SingleOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);

        if (transaction is null)
            return NotFound();

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Parsea el archivo (.csv/.xlsx) con el mapeo de columnas indicado y devuelve una
    /// previsualización, marcando filas con error y posibles duplicados (fecha+monto+descripción
    /// exactos contra transacciones ya existentes). No guarda nada en la BD (US-10/US-11).
    /// </summary>
    [HttpPost("import/preview")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<ImportPreviewResponse>> PreviewImport(
        IFormFile file,
        [FromQuery] string dateColumn,
        [FromQuery] string amountColumn,
        [FromQuery] string descriptionColumn)
    {
        if (file is null || file.Length == 0)
            return BadRequest("Subí un archivo .csv o .xlsx.");

        if (string.IsNullOrWhiteSpace(dateColumn) || string.IsNullOrWhiteSpace(amountColumn) || string.IsNullOrWhiteSpace(descriptionColumn))
            return BadRequest("Indicá dateColumn, amountColumn y descriptionColumn.");

        var parser = fileParsers.FirstOrDefault(p => p.CanParse(file.FileName));
        if (parser is null)
            return BadRequest("Formato no soportado. Subí un archivo .csv o .xlsx.");

        List<ParsedImportRow> parsedRows;
        try
        {
            await using var stream = file.OpenReadStream();
            parsedRows = parser.Parse(stream, dateColumn, amountColumn, descriptionColumn).ToList();
        }
        catch (Exception ex)
        {
            return BadRequest($"No se pudo leer el archivo: {ex.Message}");
        }

        var existingSet = (await db.Transactions
            .Where(t => t.UserId == CurrentUserId)
            .Select(t => new { t.Date, t.Amount, t.Description })
            .ToListAsync())
            .Select(t => (t.Date.Date, t.Amount, Description: t.Description.Trim().ToLowerInvariant()))
            .ToHashSet();

        var previews = parsedRows.Select(r =>
        {
            var isDuplicate = r.Error is null
                && r.Date is not null
                && r.Amount is not null
                && existingSet.Contains((r.Date.Value.Date, r.Amount.Value, (r.Description ?? string.Empty).Trim().ToLowerInvariant()));

            return new ImportRowPreview(r.RowNumber, r.Date, r.Amount, r.Description, isDuplicate, r.Error);
        }).ToList();

        return new ImportPreviewResponse(
            TotalRows: previews.Count,
            ValidRows: previews.Count(p => p.Error is null),
            ErrorRows: previews.Count(p => p.Error is not null),
            DuplicateRows: previews.Count(p => p.IsDuplicate),
            Rows: previews);
    }

    /// <summary>
    /// Inserta las filas que el cliente confirmó importar (después de que el usuario revisó
    /// la previsualización y descartó filas fila por fila, US-11). Fuente = CsvImport.
    /// </summary>
    [HttpPost("import/confirm")]
    public async Task<ActionResult<ImportConfirmResponse>> ConfirmImport(ImportConfirmRequest request)
    {
        if (request.Rows.Count == 0)
            return BadRequest("No hay filas para importar.");

        var accountId = request.AccountId ?? await GetOrCreateDefaultAccountIdAsync();

        if (!await db.Accounts.AnyAsync(a => a.Id == accountId && a.UserId == CurrentUserId))
            return BadRequest("La cuenta indicada no existe o no te pertenece.");

        var categoryIds = request.Rows
            .Where(r => r.CategoryId is not null)
            .Select(r => r.CategoryId!.Value)
            .Distinct()
            .ToList();

        if (categoryIds.Count > 0)
        {
            var validCount = await db.Categories
                .CountAsync(c => categoryIds.Contains(c.Id) && (c.UserId == null || c.UserId == CurrentUserId));

            if (validCount != categoryIds.Count)
                return BadRequest("Alguna de las categorías indicadas no existe o no te pertenece.");
        }

        var transactions = request.Rows.Select(r => new Transaction
        {
            UserId = CurrentUserId,
            AccountId = accountId,
            CategoryId = r.CategoryId,
            Amount = r.Amount,
            Currency = "COP",
            Description = r.Description,
            Date = r.Date,
            Source = TransactionSource.CsvImport,
        }).ToList();

        db.Transactions.AddRange(transactions);
        await db.SaveChangesAsync();

        var ids = transactions.Select(t => t.Id).ToList();
        var responses = await db.Transactions
            .Where(t => ids.Contains(t.Id))
            .OrderByDescending(t => t.Date)
            .Select(ProjectToResponse)
            .ToListAsync();

        return new ImportConfirmResponse(responses.Count, responses);
    }

    private static readonly System.Linq.Expressions.Expression<Func<Transaction, TransactionResponse>> ProjectToResponse =
        t => new TransactionResponse(
            t.Id,
            t.AccountId,
            t.Account != null ? t.Account.Name : null,
            t.CategoryId,
            t.Category != null ? t.Category.Name : null,
            t.Amount,
            t.Currency,
            t.Description,
            t.Date,
            t.Source.ToString(),
            t.CreatedAt);

    private async Task<bool> IsValidCategoryAsync(Guid categoryId) =>
        await db.Categories.AnyAsync(c => c.Id == categoryId && (c.UserId == null || c.UserId == CurrentUserId));

    private async Task<Guid> GetOrCreateDefaultAccountIdAsync()
    {
        var existingId = await db.Accounts
            .Where(a => a.UserId == CurrentUserId)
            .OrderBy(a => a.Name)
            .Select(a => (Guid?)a.Id)
            .FirstOrDefaultAsync();

        if (existingId is not null)
            return existingId.Value;

        var defaultAccount = new Account
        {
            UserId = CurrentUserId,
            Name = "Efectivo",
            Type = AccountType.Cash,
            Origin = AccountOrigin.Manual,
        };

        db.Accounts.Add(defaultAccount);
        await db.SaveChangesAsync();

        return defaultAccount.Id;
    }
}
