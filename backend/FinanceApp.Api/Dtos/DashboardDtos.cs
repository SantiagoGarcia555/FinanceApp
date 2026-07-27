namespace FinanceApp.Api.Dtos;

public record CategorySummary(Guid? CategoryId, string CategoryName, string? Icon, decimal Total);

/// <summary>
/// TotalExpense y Balance conservan el signo de Amount (gastos negativos), igual que en
/// TransactionResponse — el frontend aplica Math.Abs si necesita mostrarlo como positivo.
/// </summary>
public record MonthlySummaryResponse(
    string Month,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Balance,
    IReadOnlyList<CategorySummary> ExpensesByCategory);

public record MonthlyTrendPoint(string Month, decimal TotalIncome, decimal TotalExpense, decimal Balance);

public record TrendResponse(IReadOnlyList<MonthlyTrendPoint> Months);
