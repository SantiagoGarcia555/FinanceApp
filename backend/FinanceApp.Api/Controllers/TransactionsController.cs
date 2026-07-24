using FinanceApp.Api.Data;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Transaction>>> GetAll()
        => await db.Transactions.OrderByDescending(t => t.Date).ToListAsync();

    [HttpPost]
    public async Task<ActionResult<Transaction>> Create(Transaction transaction)
    {
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = transaction.Id }, transaction);
    }

    // TODO: endpoint de importación CSV/Excel (fase MVP)
    // TODO: endpoint /api/transactions/import-csv
}
