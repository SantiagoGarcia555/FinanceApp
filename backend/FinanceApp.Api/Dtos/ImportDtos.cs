namespace FinanceApp.Api.Dtos;

/// <summary>
/// Respuesta de import/inspect: columnas del archivo, primeras filas (texto) y el mapeo sugerido
/// a partir de nombres habituales ("Fecha", "Valor", "Descripción"…). Cualquiera puede ser null.
/// </summary>
/// <param name="Sheets">Hojas del libro (vacío en CSV). Si hay más de una, el cliente deja elegir.</param>
/// <param name="Sheet">Hoja leída.</param>
/// <param name="DetectedCurrency">Moneda que declara la hoja ("COP", "USD"…); null si no la declara.</param>
/// <param name="SuggestInvertSign">Parece tarjeta de crédito (cargos en positivo): sugerir invertir signos.</param>
/// <param name="PeriodStart">Periodo del extracto (DESDE/HASTA), usado para dar año a fechas como "1/07".</param>
public record ImportInspectResponse(
    IReadOnlyList<string> Headers,
    IReadOnlyList<IReadOnlyList<string>> SampleRows,
    string? SuggestedDateColumn,
    string? SuggestedAmountColumn,
    string? SuggestedDescriptionColumn,
    IReadOnlyList<string> Sheets,
    string? Sheet,
    string? DetectedCurrency,
    bool SuggestInvertSign,
    DateTime? PeriodStart,
    DateTime? PeriodEnd);

/// <param name="YearInferred">La fecha venía sin año y se dedujo del periodo del extracto (o de hoy).</param>
public record ImportRowPreview(
    int RowNumber,
    DateTime? Date,
    decimal? Amount,
    string? Description,
    bool IsDuplicate,
    string? Error,
    bool YearInferred);

/// <param name="IgnoredRows">Filas que no son movimientos (encabezados repetidos, datos del cliente, resumen).</param>
public record ImportPreviewResponse(
    int TotalRows,
    int ValidRows,
    int ErrorRows,
    int DuplicateRows,
    IReadOnlyList<ImportRowPreview> Rows,
    int IgnoredRows,
    int YearInferredRows,
    DateTime? PeriodStart,
    DateTime? PeriodEnd);

public record ImportConfirmRow(DateTime Date, decimal Amount, string Description, Guid? CategoryId);

public record ImportConfirmRequest(Guid? AccountId, IReadOnlyList<ImportConfirmRow> Rows);

public record ImportConfirmResponse(int ImportedCount, IReadOnlyList<TransactionResponse> Transactions);
