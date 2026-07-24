namespace FinanceApp.Api.Dtos;

/// <summary>AccountId es opcional: si no se manda, se usa la cuenta por defecto del usuario (ver US en Especificacion_Funcional_MVP).</summary>
public record TransactionRequest(
    Guid? AccountId,
    Guid? CategoryId,
    decimal Amount,
    string? Currency,
    string Description,
    DateTime Date);

public record TransactionResponse(
    Guid Id,
    Guid AccountId,
    string? AccountName,
    Guid? CategoryId,
    string? CategoryName,
    decimal Amount,
    string Currency,
    string Description,
    DateTime Date,
    string Source,
    DateTime CreatedAt);
