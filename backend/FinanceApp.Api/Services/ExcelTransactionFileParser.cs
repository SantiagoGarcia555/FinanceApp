using ClosedXML.Excel;

namespace FinanceApp.Api.Services;

public class ExcelTransactionFileParser : ITransactionFileParser
{
    public bool CanParse(string fileName) =>
        fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);

    public IReadOnlyList<ParsedImportRow> Parse(
        Stream fileStream,
        string dateColumn,
        string amountColumn,
        string descriptionColumn)
    {
        using var workbook = new XLWorkbook(fileStream);
        var worksheet = workbook.Worksheets.First();
        var headerRow = worksheet.FirstRowUsed();

        if (headerRow is null)
            return [];

        var columnIndexes = headerRow.CellsUsed()
            .ToDictionary(c => c.GetString().Trim(), c => c.Address.ColumnNumber);

        if (!columnIndexes.TryGetValue(dateColumn, out var dateCol) ||
            !columnIndexes.TryGetValue(amountColumn, out var amountCol) ||
            !columnIndexes.TryGetValue(descriptionColumn, out var descCol))
        {
            throw new InvalidOperationException(
                "No se encontraron todas las columnas indicadas en el encabezado del archivo.");
        }

        var rows = new List<ParsedImportRow>();
        var rowNumber = 1;

        foreach (var row in worksheet.RowsUsed().Skip(1))
        {
            rowNumber++;

            var description = row.Cell(descCol).GetString().Trim();
            var hasDate = row.Cell(dateCol).TryGetValue(out DateTime date);
            var hasAmount = row.Cell(amountCol).TryGetValue(out decimal amount);

            if (!hasDate)
            {
                rows.Add(new ParsedImportRow(rowNumber, null, hasAmount ? amount : null, description, "Fecha inválida o vacía."));
                continue;
            }

            if (!hasAmount)
            {
                rows.Add(new ParsedImportRow(rowNumber, date, null, description, "Monto inválido o vacío."));
                continue;
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                rows.Add(new ParsedImportRow(rowNumber, date, amount, description, "Descripción vacía."));
                continue;
            }

            rows.Add(new ParsedImportRow(rowNumber, date, amount, description, null));
        }

        return rows;
    }
}
