using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/budgets")]
public class BudgetsController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("Token sin claim 'sub'."));

    /// <summary>Presupuestos del usuario con lo gastado en el mes indicado (por defecto, el actual).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BudgetResponse>>> GetAll([FromQuery] string? month)
    {
        if (!TryParseMonth(month, out var monthStart))
            return BadRequest("El parámetro 'month' debe tener formato YYYY-MM.");

        var budgets = await db.Budgets
            .Include(b => b.Category)
            .Where(b => b.UserId == CurrentUserId)
            .ToListAsync();

        var responses = await BuildResponsesAsync(budgets, monthStart);
        return responses.OrderByDescending(r => r.PercentUsed).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<BudgetResponse>> Create(BudgetRequest request)
    {
        if (request.LimitAmount <= 0)
            return BadRequest("El límite del presupuesto debe ser mayor a cero.");

        if (!TryParsePeriod(request.Period, out var period))
            return BadRequest("El periodo debe ser 'monthly' o 'yearly'.");

        var category = await db.Categories
            .SingleOrDefaultAsync(c => c.Id == request.CategoryId && (c.UserId == null || c.UserId == CurrentUserId));
        if (category is null)
            return BadRequest("La categoría indicada no existe o no te pertenece.");

        if (await db.Budgets.AnyAsync(b => b.UserId == CurrentUserId && b.CategoryId == request.CategoryId && b.Period == period))
            return Conflict("Ya tienes un presupuesto para esa categoría.");

        var budget = new Budget
        {
            UserId = CurrentUserId,
            CategoryId = request.CategoryId,
            Category = category,
            LimitAmount = request.LimitAmount,
            Period = period,
        };

        db.Budgets.Add(budget);
        await db.SaveChangesAsync();

        var response = (await BuildResponsesAsync([budget], CurrentMonthStart())).Single();
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BudgetResponse>> Update(Guid id, BudgetUpdateRequest request)
    {
        var budget = await db.Budgets
            .Include(b => b.Category)
            .SingleOrDefaultAsync(b => b.Id == id && b.UserId == CurrentUserId);
        if (budget is null)
            return NotFound();

        if (request.LimitAmount <= 0)
            return BadRequest("El límite del presupuesto debe ser mayor a cero.");

        if (!TryParsePeriod(request.Period ?? PeriodToString(budget.Period), out var period))
            return BadRequest("El periodo debe ser 'monthly' o 'yearly'.");

        if (period != budget.Period &&
            await db.Budgets.AnyAsync(b => b.UserId == CurrentUserId && b.CategoryId == budget.CategoryId && b.Period == period))
            return Conflict("Ya tienes un presupuesto para esa categoría y periodo.");

        budget.LimitAmount = request.LimitAmount;
        budget.Period = period;
        await db.SaveChangesAsync();

        return (await BuildResponsesAsync([budget], CurrentMonthStart())).Single();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var budget = await db.Budgets.SingleOrDefaultAsync(b => b.Id == id && b.UserId == CurrentUserId);
        if (budget is null)
            return NotFound();

        db.Budgets.Remove(budget);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Calcula lo gastado por categoría: el mes para presupuestos mensuales, el año para los anuales.</summary>
    private async Task<List<BudgetResponse>> BuildResponsesAsync(IReadOnlyList<Budget> budgets, DateTime monthStart)
    {
        if (budgets.Count == 0)
            return [];

        var categoryIds = budgets.Select(b => b.CategoryId).Distinct().ToList();
        var yearStart = new DateTime(monthStart.Year, 1, 1);
        var yearEnd = yearStart.AddYears(1);

        // Una sola consulta: gastos del año de las categorías presupuestadas, agrupados por categoría y mes.
        var spending = await db.Transactions
            .Where(t => t.UserId == CurrentUserId
                && t.Amount < 0
                && t.CategoryId != null
                && categoryIds.Contains(t.CategoryId.Value)
                && t.Date >= yearStart && t.Date < yearEnd)
            .GroupBy(t => new { CategoryId = t.CategoryId!.Value, t.Date.Month })
            .Select(g => new { g.Key.CategoryId, g.Key.Month, Total = -g.Sum(t => t.Amount) })
            .ToListAsync();

        return budgets.Select(b =>
        {
            var spent = spending
                .Where(s => s.CategoryId == b.CategoryId && (b.Period == BudgetPeriod.Yearly || s.Month == monthStart.Month))
                .Sum(s => s.Total);

            return new BudgetResponse(
                b.Id,
                b.CategoryId,
                b.Category?.Name ?? "Categoría",
                b.Category?.Icon,
                b.LimitAmount,
                PeriodToString(b.Period),
                spent,
                b.LimitAmount - spent,
                b.LimitAmount > 0 ? Math.Round(spent / b.LimitAmount * 100, 1) : 0);
        }).ToList();
    }

    private static DateTime CurrentMonthStart()
    {
        var today = DateTime.UtcNow;
        return new DateTime(today.Year, today.Month, 1);
    }

    private static bool TryParseMonth(string? month, out DateTime monthStart)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            monthStart = CurrentMonthStart();
            return true;
        }

        var ok = DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed);
        monthStart = ok ? new DateTime(parsed.Year, parsed.Month, 1) : default;
        return ok;
    }

    private static bool TryParsePeriod(string? value, out BudgetPeriod period)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case null or "" or "monthly":
                period = BudgetPeriod.Monthly;
                return true;
            case "yearly":
                period = BudgetPeriod.Yearly;
                return true;
            default:
                period = default;
                return false;
        }
    }

    private static string PeriodToString(BudgetPeriod period) =>
        period == BudgetPeriod.Yearly ? "yearly" : "monthly";
}
