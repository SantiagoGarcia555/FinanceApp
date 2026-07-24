namespace FinanceApp.Api.Models;

public enum TransactionSource
{
    Manual,
    CsvImport,
    OpenBanking, // fase futura: Belvo / Salt Edge / TrueLayer
}

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "COP";
    public string Description { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public TransactionSource Source { get; set; } = TransactionSource.Manual;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
