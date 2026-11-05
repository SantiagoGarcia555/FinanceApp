using System.Globalization;
using ClosedXML.Excel;

namespace FinanceApp.Api.Services;

public class ExcelTransactionFileParser : ITransactionFileParser
{
    public bool CanParse(string fileName) =>
        fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);

    public ImportFileSample Sample(Stream fileStream, int maxRows)
    {
        using var workbook = new XLWorkbook(fileStream);
        var worksheet = workbook.Worksheets.First();
        var headerRow = worksheet.FirstRowUsed();
        if (headerRow is null)
            return new ImportFileSample([], []);

        var headerCells = headerRow.CellsUsed().ToList();
        var headers = headerCells.Select(c => c.GetString().Trim()).ToList();
        var rows = worksheet.RowsUsed()
            .Where(r => r.RowNumber() > headerRow.RowNumber())
            .Take(maxRows)
            .Select(r => (IReadOnlyList<string>)headerCells
                .Select(h => r.Cell(h.Address.ColumnNumber).GetFormattedString().Trim())
                .ToList())
            .ToList();

        return new ImportFileSample(headers, rows);
    }

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
            .GroupBy(c => c.GetString().Trim())
            .ToDictionary(g => g.Key, g => g.First().Address.ColumnNumber);

        if (!columnIndexes.TryGetValue(dateColumn.Trim(), out var dateCol) ||
            !columnIndexes.TryGetValue(amountColumn.Trim(), out var amountCol) ||
            !columnIndexes.TryGetValue(descriptionColumn.Trim(), out var descCol))
        {
            throw new InvalidOperationException(
                "No se encontraron todas las columnas indicadas en el encabezado del archivo.");
        }

        var rows = new List<ParsedImportRow>();

        foreach (var row in worksheet.RowsUsed().Where(r => r.RowNumber() > headerRow.RowNumber()))
        {
            var rowNumber = row.RowNumber();
            var description = row.Cell(descCol).GetString().Trim();
            var hasDate = TryReadDate(row.Cell(dateCol), out var date);
            var hasAmount = TryReadAmount(row.Cell(amountCol), out var amount);

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

    /// <summary>Celda fecha nativa, número serial de Excel o texto ("05/11/2026").</summary>
    private static bool TryReadDate(IXLCell cell, out DateTime date)
    {
        var value = cell.Value;
        if (value.IsDateTime)
        {
            date = value.GetDateTime().Date;
            return true;
        }

        if (value.IsNumber)
            return ImportValueParser.TryParseDate(value.GetNumber().ToString(CultureInfo.InvariantCulture), out date);

        return ImportValueParser.TryParseDate(cell.GetString(), out date);
    }

    /// <summary>Celda numérica nativa o texto con formato local ("$ -38.900"). No usa la cultura del servidor.</summary>
    private static bool TryReadAmount(IXLCell cell, out decimal amount)
    {
        var value = cell.Value;
        if (value.IsNumber)
        {
            amount = (decimal)value.GetNumber();
            return true;
        }

        return ImportValueParser.TryParseAmount(cell.GetString(), out amount);
    }
}
