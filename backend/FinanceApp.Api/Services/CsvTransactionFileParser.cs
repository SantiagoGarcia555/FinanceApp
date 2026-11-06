using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

namespace FinanceApp.Api.Services;

/// <summary>
/// Lee .csv sin asumir que la primera línea es el encabezado (los extractos traen filas de cliente/resumen
/// arriba); <see cref="StatementReader"/> decide dónde empieza la tabla. Todas las celdas son texto.
/// </summary>
public class CsvTransactionFileParser : ITransactionFileParser
{
    public bool CanParse(string fileName) =>
        fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);

    public StatementSheet Read(Stream fileStream, string? sheetName = null)
    {
        using var csv = OpenReader(fileStream);
        var rows = new List<SheetRow>();
        var recordNumber = 0;

        while (csv.Read())
        {
            recordNumber++;
            var cells = (csv.Parser.Record ?? []).Select(v => new SheetCell(v?.Trim() ?? string.Empty)).ToList();
            if (cells.Any(c => !c.IsEmpty))
                rows.Add(new SheetRow(recordNumber, cells));
        }

        return new StatementSheet([], null, rows);
    }

    /// <summary>Detecta codificación (UTF-8 / Latin-1) y separador (",", ";", tab, "|").</summary>
    private static CsvReader OpenReader(Stream fileStream)
    {
        var text = ImportValueParser.DecodeText(fileStream);
        return new CsvReader(new StringReader(text), new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = false,
            DetectDelimiter = true,
            MissingFieldFound = null,
            BadDataFound = null,
            TrimOptions = TrimOptions.Trim,
        });
    }
}
