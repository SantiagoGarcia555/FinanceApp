namespace FinanceApp.Api.Models;

public enum BudgetPeriod
{
    Monthly,
    Yearly,
}

public class Budget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public decimal LimitAmount { get; set; }
    public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
}
