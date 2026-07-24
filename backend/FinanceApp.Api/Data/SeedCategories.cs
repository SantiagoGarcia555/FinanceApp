using FinanceApp.Api.Models;

namespace FinanceApp.Api.Data;

/// <summary>
/// Categorías del sistema (IsSystemDefined = true, UserId = null) sembradas vía
/// EF Core HasData. Los Ids son fijos para que la migración sea determinística
/// y para poder referenciarlas desde el código (ej. categoría "Otros" por defecto
/// en el importador CSV).
/// </summary>
public static class SeedCategories
{
    public static readonly Guid AlimentacionId = Guid.Parse("40643b72-5107-4e0d-8321-9318b6a6dae9");
    public static readonly Guid TransporteId = Guid.Parse("e0a52530-1752-46a4-b1a2-5df68d3e3f1d");
    public static readonly Guid ViviendaId = Guid.Parse("3c723a1e-8528-4653-ac34-d16881e55d1c");
    public static readonly Guid ServiciosPublicosId = Guid.Parse("84240dc6-9c7d-429c-80cb-eb7abdcff105");
    public static readonly Guid SaludId = Guid.Parse("089a6b63-3b72-4831-9622-6d99599394e5");
    public static readonly Guid EducacionId = Guid.Parse("b372fb3c-4a28-4fbe-86e2-494191cb0ebc");
    public static readonly Guid EntretenimientoId = Guid.Parse("e746965f-73fc-4208-a642-c6bbdf7ece7e");
    public static readonly Guid RopaId = Guid.Parse("55943f03-6976-47ad-808b-f494ff5750e2");
    public static readonly Guid AhorroInversionId = Guid.Parse("3ac79515-6c07-403c-8804-61728472f72f");
    public static readonly Guid DeudasId = Guid.Parse("8eac4693-af45-4894-adc8-ce742c0d08b4");
    public static readonly Guid MascotasId = Guid.Parse("b100c846-cb78-44cf-8d5c-32494f3c3f49");
    public static readonly Guid IngresosId = Guid.Parse("666903fa-4cea-4cb2-a3ac-f6030cd18cf8");
    public static readonly Guid OtrosId = Guid.Parse("c17353ed-5ecc-4cd3-82fb-78e51dbd9f57");

    public static Category[] All =>
    [
        new() { Id = AlimentacionId, Name = "Alimentación", Icon = "food", IsSystemDefined = true },
        new() { Id = TransporteId, Name = "Transporte", Icon = "transport", IsSystemDefined = true },
        new() { Id = ViviendaId, Name = "Vivienda", Icon = "home", IsSystemDefined = true },
        new() { Id = ServiciosPublicosId, Name = "Servicios públicos", Icon = "utilities", IsSystemDefined = true },
        new() { Id = SaludId, Name = "Salud", Icon = "health", IsSystemDefined = true },
        new() { Id = EducacionId, Name = "Educación", Icon = "education", IsSystemDefined = true },
        new() { Id = EntretenimientoId, Name = "Entretenimiento", Icon = "entertainment", IsSystemDefined = true },
        new() { Id = RopaId, Name = "Ropa", Icon = "clothing", IsSystemDefined = true },
        new() { Id = AhorroInversionId, Name = "Ahorro e inversión", Icon = "savings", IsSystemDefined = true },
        new() { Id = DeudasId, Name = "Deudas y préstamos", Icon = "debt", IsSystemDefined = true },
        new() { Id = MascotasId, Name = "Mascotas", Icon = "pets", IsSystemDefined = true },
        new() { Id = IngresosId, Name = "Ingresos", Icon = "income", IsSystemDefined = true },
        new() { Id = OtrosId, Name = "Otros", Icon = "other", IsSystemDefined = true },
    ];
}
