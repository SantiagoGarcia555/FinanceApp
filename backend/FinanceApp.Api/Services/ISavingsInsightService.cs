using FinanceApp.Api.Models;

namespace FinanceApp.Api.Services;

/// <summary>
/// Contrato para el motor de insights de ahorro y predicciones.
/// Implementación inicial (fase 2 del roadmap) usará ML.NET:
/// - Detección de anomalías/gastos inusuales (time series anomaly detection).
/// - Forecasting de gasto futuro por categoría (SSA forecasting).
/// - Clustering de patrones de consumo para sugerir oportunidades de ahorro.
/// No requiere llamadas a APIs externas de pago.
/// </summary>
public interface ISavingsInsightService
{
    Task<IReadOnlyList<string>> GetSavingsOpportunitiesAsync(Guid userId);
    Task<decimal> PredictNextMonthSpendAsync(Guid userId, Guid categoryId);
}
