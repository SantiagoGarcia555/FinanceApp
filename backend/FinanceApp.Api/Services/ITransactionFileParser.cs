namespace FinanceApp.Api.Services;

/// <summary>Fila cruda parseada del archivo importado, antes de validar contra la BD (cuenta/categoría/duplicados).</summary>
public record ParsedImportRow(int RowNumber, DateTime? Date, decimal? Amount, string? Description, string? Error);

/// <summary>
/// Parsea un archivo de extracto (CSV o Excel) a filas de transacción, con mapeo de
/// columnas configurable por el usuario (US-10: soporta .csv y .xlsx).
/// </summary>
public interface ITransactionFileParser
{
    bool CanParse(string fileName);

    IReadOnlyList<ParsedImportRow> Parse(
        Stream fileStream,
        string dateColumn,
        string amountColumn,
        string descriptionColumn);
}
