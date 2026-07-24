namespace FinanceApp.Api.Services;

/// <summary>
/// Puerto/adaptador para integraciones bancarias futuras (Open Banking).
/// Cada agregador (Belvo, Salt Edge, TrueLayer, Openbank directo) implementa
/// esta interfaz, de modo que el core de la app no depende de un proveedor
/// específico. Fase futura del roadmap, no bloquea el MVP.
/// </summary>
public interface IBankProviderAdapter
{
    string ProviderName { get; }
    Task<IReadOnlyList<Models.Transaction>> FetchTransactionsAsync(string linkedAccountId, DateTime since);
}
