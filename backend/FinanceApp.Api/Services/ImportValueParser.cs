using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace FinanceApp.Api.Services;

/// <summary>
/// Interpretación tolerante de valores de extractos bancarios latinoamericanos (mercado inicial: Colombia).
/// Los bancos exportan fechas día/mes, montos con punto de miles ("38.900", "$ -1.234.567,89"),
/// separador ";" y codificación Windows-1252/Latin-1; InvariantCulture interpretaría mal casi todo eso.
/// </summary>
public static partial class ImportValueParser
{
    private static readonly CultureInfo EsCo = CultureInfo.GetCultureInfo("es-CO");

    // Día primero (convención colombiana). Un archivo en formato US (mes/día) con día ≤ 12 se leería al revés:
    // limitación conocida, el usuario lo ve en la previsualización antes de confirmar.
    private static readonly string[] DateFormats =
    [
        "yyyy-MM-dd", "yyyy/MM/dd", "yyyyMMdd",
        "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "dd.MM.yyyy",
        "dd/MM/yy", "d/M/yy",
        "yyyy-MM-dd HH:mm:ss", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mm:ssZ",
        "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm", "d/M/yyyy H:mm:ss", "d/M/yyyy H:mm",
        "dd-MMM-yyyy", "d MMM yyyy", "dd MMM yyyy",
    ];

    public static bool TryParseDate(string? raw, out DateTime date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var value = raw.Trim();

        if (DateTime.TryParseExact(value, DateFormats, EsCo, DateTimeStyles.AllowWhiteSpaces, out date) ||
            DateTime.TryParseExact(value, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out date))
        {
            date = date.Date;
            return true;
        }

        // Fecha serial de Excel guardada como texto/número (p. ej. "45967").
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var serial) && serial is > 20_000 and < 80_000)
        {
            date = DateTime.FromOADate(serial).Date;
            return true;
        }

        return false;
    }

    /// <summary>
    /// Fecha sin año, día primero ("1/07", "30-09"), como la exportan los extractos de ahorros de Bancolombia.
    /// Solo valida rangos básicos; el año lo resuelve <see cref="ResolveYear"/> con el periodo del extracto.
    /// </summary>
    public static bool TryParseDayMonth(string? raw, out int day, out int month)
    {
        day = month = 0;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var match = DayMonth().Match(raw.Trim());
        if (!match.Success)
            return false;

        day = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        month = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        return day is >= 1 and <= 31 && month is >= 1 and <= 12;
    }

    /// <summary>
    /// Asigna año a una fecha día/mes. Con periodo del extracto (DESDE/HASTA) elige el año que cae dentro de él,
    /// lo que resuelve los extractos que cruzan diciembre → enero. Sin periodo, asume la fecha más reciente que
    /// no sea posterior a <paramref name="referenceDate"/> (normalmente hoy).
    /// </summary>
    public static bool ResolveYear(int day, int month, StatementPeriod? period, DateTime referenceDate, out DateTime date)
    {
        date = default;

        if (period is not null)
        {
            // Holgura de una semana: algunos bancos registran movimientos con fecha valor justo fuera del corte.
            var from = period.Start.AddDays(-7);
            var to = period.End.AddDays(7);
            for (var year = period.End.Year; year >= period.Start.Year; year--)
            {
                if (TryBuild(year, month, day, out var candidate) && candidate >= from && candidate <= to)
                {
                    date = candidate;
                    return true;
                }
            }

            referenceDate = period.End;
        }

        if (TryBuild(referenceDate.Year, month, day, out var current) && current <= referenceDate.Date)
        {
            date = current;
            return true;
        }

        return TryBuild(referenceDate.Year - 1, month, day, out date);
    }

    private static bool TryBuild(int year, int month, int day, out DateTime date)
    {
        date = default;
        if (day > DateTime.DaysInMonth(year, month))
            return false;

        date = new DateTime(year, month, day);
        return true;
    }

    /// <summary>"DOLARES", "USD", "Pesos" → código ISO; null si no hay valor.</summary>
    public static string? NormalizeCurrency(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var value = Normalize(raw);
        if (value.Contains("dolar") || value.Contains("usd") || value.Contains("us$"))
            return "USD";
        if (value.Contains("peso") || value.Contains("cop"))
            return "COP";
        if (value.Contains("euro") || value.Contains("eur"))
            return "EUR";

        return raw.Trim().ToUpperInvariant();
    }

    /// <summary>
    /// Acepta "38.900", "-38900", "$ 1.234.567,89", "1,234,567.89", "(5.000)", "5.000-", "COP 12.000".
    /// Regla del separador: si hay "." y "," el último es el decimal; si hay uno solo, se toma como
    /// separador de miles cuando se repite o le siguen exactamente 3 dígitos (lo habitual en pesos).
    /// </summary>
    public static bool TryParseAmount(string? raw, out decimal amount)
    {
        amount = 0;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var value = raw.Trim();
        var negative = false;

        if (value.StartsWith('(') && value.EndsWith(')'))
        {
            negative = true;
            value = value[1..^1];
        }

        value = NonNumeric().Replace(value, string.Empty); // quita $, COP, espacios, nbsp…

        if (value.EndsWith('-'))
        {
            negative = true;
            value = value[..^1];
        }

        if (value.StartsWith('-'))
        {
            negative = true;
            value = value[1..];
        }
        else if (value.StartsWith('+'))
        {
            value = value[1..];
        }

        if (value.Length == 0 || value.Contains('-') || value.Contains('+'))
            return false;

        var lastDot = value.LastIndexOf('.');
        var lastComma = value.LastIndexOf(',');
        string normalized;

        if (lastDot >= 0 && lastComma >= 0)
        {
            var decimalSep = lastDot > lastComma ? '.' : ',';
            var thousandsSep = decimalSep == '.' ? ',' : '.';
            normalized = value.Replace(thousandsSep.ToString(), string.Empty).Replace(decimalSep, '.');
        }
        else if (lastDot >= 0 || lastComma >= 0)
        {
            var sep = lastComma >= 0 ? ',' : '.';
            var occurrences = value.Count(c => c == sep);
            var digitsAfter = value.Length - value.LastIndexOf(sep) - 1;
            var isThousands = occurrences > 1 || digitsAfter == 3;
            normalized = isThousands ? value.Replace(sep.ToString(), string.Empty) : value.Replace(sep, '.');
        }
        else
        {
            normalized = value;
        }

        if (!decimal.TryParse(normalized, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out amount))
            return false;

        if (negative)
            amount = -amount;

        return true;
    }

    /// <summary>Decodifica UTF-8 (con o sin BOM) y, si los bytes no son UTF-8 válido, cae a Latin-1 (exportes de Excel en Windows).</summary>
    public static string DecodeText(Stream stream)
    {
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        var bytes = buffer.ToArray();

        try
        {
            return new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true)
                .GetString(bytes)
                .TrimStart('﻿');
        }
        catch (DecoderFallbackException)
        {
            return Encoding.Latin1.GetString(bytes);
        }
    }

    public record ColumnSuggestion(string? DateColumn, string? AmountColumn, string? DescriptionColumn);

    /// <summary>Sugiere el mapeo según nombres de columna habituales en extractos (es/en).</summary>
    public static ColumnSuggestion SuggestColumns(IReadOnlyList<string> headers)
    {
        string? Find(params string[] keys) =>
            keys.Select(k => headers.FirstOrDefault(h => Normalize(h).Contains(k))).FirstOrDefault(h => h is not null);

        return new ColumnSuggestion(
            Find("fecha", "date"),
            Find("valor", "monto", "importe", "amount", "cantidad", "total"),
            // "movimiento" = columna "Movimientos" de las tarjetas Bancolombia. Va al final para no
            // ganarle a "descripcion"; "Valor Movimiento" va después de "Movimientos" en ese extracto.
            Find("descripcion", "concepto", "detalle", "description", "comercio", "referencia", "transaccion", "movimiento"));
    }

    /// <summary>Minúsculas, sin tildes y sin espacios en los extremos (para comparar encabezados y etiquetas).</summary>
    public static string Normalize(string value)
    {
        var decomposed = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        return new string(decomposed.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
    }

    [GeneratedRegex(@"[^\d,.\-+]")]
    private static partial Regex NonNumeric();

    [GeneratedRegex(@"^(\d{1,2})[/-](\d{1,2})$")]
    private static partial Regex DayMonth();
}
