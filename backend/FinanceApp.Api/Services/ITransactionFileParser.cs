namespace FinanceApp.Api.Services;

/// <summary>Fila cruda parseada del archivo importado, antes de validar contra la BD (cuenta/categoría/duplicados).</summary>
public record ParsedImportRow(int RowNumber, DateTime? Date, decimal? Amount, string? Description, string? Error);

/// <summary>Encabezados y primeras filas (como texto) para que el usuario elija el mapeo de columnas.</summary>
public record ImportFileSample(IReadOnlyList<string> Headers, IReadOnlyList<IReadOnlyList<string>> Rows);

/// <summary>
/// Parsea un archivo de extracto (CSV o Excel) a filas de transacción, con mapeo de
/// columnas configurable por el usuario (US-10: soporta .csv y .xlsx).
/// </summary>
public interface ITransactionFileParser
{
    bool CanParse(string fileName);

    /// <summary>Lee encabezados y hasta <paramref name="maxRows"/> filas sin interpretar valores.</summary>
    ImportFileSample Sample(Stream fileStream, int maxRows);

    IReadOnlyList<ParsedImportRow> Parse(
        Stream fileStream,
        string dateColumn,
        string amountColumn,
        string descriptionColumn);
}
