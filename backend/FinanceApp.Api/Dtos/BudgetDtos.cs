namespace FinanceApp.Api.Dtos;

/// <summary>Period: "monthly" (por defecto) o "yearly".</summary>
public record BudgetRequest(Guid CategoryId, decimal LimitAmount, string? Period);

public record BudgetUpdateRequest(decimal LimitAmount, string? Period);

/// <summary>
/// Spent = gasto (positivo) de la categoría en el periodo consultado: el mes pedido para presupuestos
/// mensuales, el año de ese mes para los anuales. Remaining puede ser negativo (presupuesto excedido).
/// </summary>
public record BudgetResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string? Icon,
    decimal LimitAmount,
    string Period,
    decimal Spent,
    decimal Remaining,
    decimal PercentUsed);
