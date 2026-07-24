namespace FinanceApp.Api.Models;

/// <summary>
/// Regla de categorización automática: si la descripción de una transacción matchea
/// PatternText, se le asigna CategoryId. Si varias reglas matchean, gana la de mayor Priority.
/// </summary>
public class CategorizationRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public string PatternText { get; set; } = string.Empty;
    public int Priority { get; set; } = 0;
}
