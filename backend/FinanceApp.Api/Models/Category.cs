namespace FinanceApp.Api.Models;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsSystemDefined { get; set; } = true;
}
