using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

namespace FinanceApp.Api.Services;

public class CsvTransactionFileParser : ITransactionFileParser
{
    public bool CanParse(string fileName) =>
        fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);

    public ImportFileSample Sample(Stream fileStream, int maxRows)
    {
        using var csv = OpenReader(fileStream);

        if (!csv.Read() || !csv.ReadHeader() || csv.HeaderRecord is null)
            return new ImportFileSample([], []);

        var headers = csv.HeaderRecord.Select(h => h.Trim()).ToList();
        var rows = new List<IReadOnlyList<string>>();
        while (rows.Count < maxRows && csv.Read())
            rows.Add(headers.Select((_, i) => csv.GetField(i)?.Trim() ?? string.Empty).ToList());

        return new ImportFileSample(headers, rows);
    }

    public IReadOnlyList<ParsedImportRow> Parse(
        Stream fileStream,
        string dateColumn,
        string amountColumn,
        string descriptionColumn)
    {
        var rows = new List<ParsedImportRow>();

        using var csv = OpenReader(fileStream);
        csv.Read();
        csv.ReadHeader();

        var headers = csv.HeaderRecord?.Select(h => h.Trim()).ToList();
        if (headers is null ||
            !headers.Contains(dateColumn.Trim()) ||
            !headers.Contains(amountColumn.Trim()) ||
            !headers.Contains(descriptionColumn.Trim()))
        {
            throw new InvalidOperationException(
                "No se encontraron todas las columnas indicadas en el encabezado del archivo.");
        }

        var rowNumber = 1;
        while (csv.Read())
        {
            rowNumber++;
            rows.Add(ParseRow(
                rowNumber,
                csv.GetField(dateColumn.Trim()),
                csv.GetField(amountColumn.Trim()),
                csv.GetField(descriptionColumn.Trim())));
        }

        return rows;
    }

    /// <summary>Detecta codificación (UTF-8 / Latin-1) y separador (",", ";", tab, "|").</summary>
    private static CsvReader OpenReader(Stream fileStream)
    {
        var text = ImportValueParser.DecodeText(fileStream);
        return new CsvReader(new StringReader(text), new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            DetectDelimiter = true,
            HeaderValidated = null,
            MissingFieldFound = null,
            BadDataFound = null,
            TrimOptions = TrimOptions.Trim,
            PrepareHeaderForMatch = args => args.Header.Trim(),
        });
    }

    private static ParsedImportRow ParseRow(int rowNumber, string? rawDate, string? rawAmount, string? description)
    {
        if (!ImportValueParser.TryParseDate(rawDate, out var date))
            return new ParsedImportRow(rowNumber, null, null, description, $"Fecha inválida: '{rawDate}'.");

        if (!ImportValueParser.TryParseAmount(rawAmount, out var amount))
            return new ParsedImportRow(rowNumber, date, null, description, $"Monto inválido: '{rawAmount}'.");

        if (string.IsNullOrWhiteSpace(description))
            return new ParsedImportRow(rowNumber, date, amount, description, "Descripción vacía.");

        return new ParsedImportRow(rowNumber, date, amount, description.Trim(), null);
    }
}
