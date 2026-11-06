using ClosedXML.Excel;

namespace FinanceApp.Api.Services;

/// <summary>
/// Lee .xlsx conservando el valor nativo de cada celda (fecha/número) además del texto visible.
/// Soporta libros con varias hojas (p. ej. tarjeta Bancolombia: "PESOS" y "DOLARES").
/// </summary>
public class ExcelTransactionFileParser : ITransactionFileParser
{
    public bool CanParse(string fileName) =>
        fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);

    public StatementSheet Read(Stream fileStream, string? sheetName = null)
    {
        using var workbook = new XLWorkbook(fileStream);
        var names = workbook.Worksheets.Select(w => w.Name).ToList();

        var worksheet = string.IsNullOrWhiteSpace(sheetName)
            ? workbook.Worksheets.First()
            : workbook.Worksheets.FirstOrDefault(w => string.Equals(w.Name, sheetName.Trim(), StringComparison.OrdinalIgnoreCase))
              ?? throw new InvalidOperationException($"El archivo no tiene una hoja llamada '{sheetName}'.");

        var lastColumn = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;
        var rows = worksheet.RowsUsed()
            .Select(r => new SheetRow(
                r.RowNumber(),
                Enumerable.Range(1, lastColumn).Select(c => ToCell(r.Cell(c))).ToList()))
            .Where(r => r.Cells.Any(c => !c.IsEmpty))
            .ToList();

        return new StatementSheet(names, worksheet.Name, rows);
    }

    private static SheetCell ToCell(IXLCell cell)
    {
        var value = cell.Value;
        var text = cell.GetFormattedString().Trim();

        if (value.IsDateTime)
            return new SheetCell(text, Date: value.GetDateTime().Date);

        if (value.IsNumber)
            return new SheetCell(text, Number: (decimal)value.GetNumber());

        return new SheetCell(text);
    }
}
