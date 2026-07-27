using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

namespace FinanceApp.Api.Services;

public class CsvTransactionFileParser : ITransactionFileParser
{
    public bool CanParse(string fileName) =>
        fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);

    public IReadOnlyList<ParsedImportRow> Parse(
        Stream fileStream,
        string dateColumn,
        string amountColumn,
        string descriptionColumn)
    {
        var rows = new List<ParsedImportRow>();

        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
        });

        csv.Read();
        csv.ReadHeader();

        if (csv.HeaderRecord is null ||
            !csv.HeaderRecord.Contains(dateColumn) ||
            !csv.HeaderRecord.Contains(amountColumn) ||
            !csv.HeaderRecord.Contains(descriptionColumn))
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
                csv.GetField(dateColumn),
                csv.GetField(amountColumn),
                csv.GetField(descriptionColumn)));
        }

        return rows;
    }

    private static ParsedImportRow ParseRow(int rowNumber, string? rawDate, string? rawAmount, string? description)
    {
        if (!DateTime.TryParse(rawDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return new ParsedImportRow(rowNumber, null, null, description, $"Fecha inválida: '{rawDate}'.");

        if (!decimal.TryParse(rawAmount, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount))
            return new ParsedImportRow(rowNumber, date, null, description, $"Monto inválido: '{rawAmount}'.");

        if (string.IsNullOrWhiteSpace(description))
            return new ParsedImportRow(rowNumber, date, amount, description, "Descripción vacía.");

        return new ParsedImportRow(rowNumber, date, amount, description.Trim(), null);
    }
}
