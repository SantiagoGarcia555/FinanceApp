namespace FinanceApp.Api.Models;

/// <summary>
/// Marca que un usuario ocultó una categoría del sistema de su listado. Las categorías
/// del sistema son compartidas y no se pueden eliminar, solo ocultar por usuario
/// (ver Especificacion_Funcional_MVP, US-08/US-09).
/// </summary>
public class HiddenCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public DateTime HiddenAt { get; set; } = DateTime.UtcNow;
}
