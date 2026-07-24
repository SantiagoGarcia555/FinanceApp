namespace FinanceApp.Api.Models;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Dueño de la categoría si es personalizada. Nulo si es una categoría del sistema (IsSystemDefined = true).</summary>
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsSystemDefined { get; set; } = true;
}
