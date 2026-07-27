using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("Token sin claim 'sub'."));

    /// <summary>Totales y gasto por categoría de un mes (US-12). Se recalcula en vivo, sin caché.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<MonthlySummaryResponse>> GetSummary([FromQuery] string? month)
    {
        if (!TryParseMonth(month, out var start, out var end, out var label))
            return BadRequest("El parámetro 'month' debe tener formato YYYY-MM.");

        var transactions = await db.Transactions
            .Where(t => t.UserId == CurrentUserId && t.Date >= start && t.Date < end)
            .Select(t => new
            {
                t.Amount,
                t.CategoryId,
                CategoryName = t.Category != null ? t.Category.Name : null,
                Icon = t.Category != null ? t.Category.Icon : null,
            })
            .ToListAsync();

        var totalIncome = transactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
        var totalExpense = transactions.Where(t => t.Amount < 0).Sum(t => t.Amount);

        var expensesByCategory = transactions
            .Where(t => t.Amount < 0)
            .GroupBy(t => new { t.CategoryId, CategoryName = t.CategoryName ?? "Sin categoría", t.Icon })
            .Select(g => new CategorySummary(g.Key.CategoryId, g.Key.CategoryName, g.Key.Icon, Math.Abs(g.Sum(x => x.Amount))))
            .OrderByDescending(c => c.Total)
            .ToList();

        return new MonthlySummaryResponse(label, totalIncome, totalExpense, totalIncome + totalExpense, expensesByCategory);
    }

    /// <summary>Totales de ingreso/gasto de los últimos N meses, para el gráfico de tendencia.</summary>
    [HttpGet("trend")]
    public async Task<ActionResult<TrendResponse>> GetTrend([FromQuery] int months = 6)
    {
        months = Math.Clamp(months, 1, 24);

        var today = DateTime.UtcNow.Date;
        var rangeStart = new DateTime(today.Year, today.Month, 1).AddMonths(-(months - 1));

        var transactions = await db.Transactions
            .Where(t => t.UserId == CurrentUserId && t.Date >= rangeStart)
            .Select(t => new { t.Amount, t.Date })
            .ToListAsync();

        var points = new List<MonthlyTrendPoint>();
        for (var i = 0; i < months; i++)
        {
            var monthStart = rangeStart.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1);

            var monthTransactions = transactions.Where(t => t.Date >= monthStart && t.Date < monthEnd).ToList();
            var income = monthTransactions.Where(t => t.Amount > 0).Sum(t => t.Amount);
            var expense = monthTransactions.Where(t => t.Amount < 0).Sum(t => t.Amount);

            points.Add(new MonthlyTrendPoint(monthStart.ToString("yyyy-MM"), income, expense, income + expense));
        }

        return new TrendResponse(points);
    }

    private static bool TryParseMonth(string? month, out DateTime start, out DateTime end, out string label)
    {
        DateTime reference;

        if (string.IsNullOrWhiteSpace(month))
        {
            reference = DateTime.UtcNow.Date;
        }
        else if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out reference))
        {
            start = end = default;
            label = string.Empty;
            return false;
        }

        start = new DateTime(reference.Year, reference.Month, 1);
        end = start.AddMonths(1);
        label = start.ToString("yyyy-MM");
        return true;
    }
}
