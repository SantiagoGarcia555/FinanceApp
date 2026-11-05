namespace FinanceApp.Api.Dtos;

/// <summary>
/// Respuesta de import/inspect: columnas del archivo, primeras filas (texto) y el mapeo sugerido
/// a partir de nombres habituales ("Fecha", "Valor", "Descripción"…). Cualquiera puede ser null.
/// </summary>
public record ImportInspectResponse(
    IReadOnlyList<string> Headers,
    IReadOnlyList<IReadOnlyList<string>> SampleRows,
    string? SuggestedDateColumn,
    string? SuggestedAmountColumn,
    string? SuggestedDescriptionColumn);

public record ImportRowPreview(
    int RowNumber,
    DateTime? Date,
    decimal? Amount,
    string? Description,
    bool IsDuplicate,
    string? Error);

public record ImportPreviewResponse(
    int TotalRows,
    int ValidRows,
    int ErrorRows,
    int DuplicateRows,
    IReadOnlyList<ImportRowPreview> Rows);

public record ImportConfirmRow(DateTime Date, decimal Amount, string Description, Guid? CategoryId);

public record ImportConfirmRequest(Guid? AccountId, IReadOnlyList<ImportConfirmRow> Rows);

public record ImportConfirmResponse(int ImportedCount, IReadOnlyList<TransactionResponse> Transactions);
