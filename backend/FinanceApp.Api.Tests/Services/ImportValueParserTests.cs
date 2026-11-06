using System.Text;
using FinanceApp.Api.Services;

namespace FinanceApp.Api.Tests.Services;

public class ImportValueParserTests
{
    // ---------- Fechas ----------

    [Theory]
    [InlineData("05/11/2026", 2026, 11, 5)] // día primero (Colombia): 5 de noviembre, NO 11 de mayo
    [InlineData("5/11/2026", 2026, 11, 5)]
    [InlineData("31/12/2026", 2026, 12, 31)]
    [InlineData("2026-11-05", 2026, 11, 5)]
    [InlineData("2026/11/05", 2026, 11, 5)]
    [InlineData("20261105", 2026, 11, 5)]
    [InlineData("05-11-2026", 2026, 11, 5)]
    [InlineData("05.11.2026", 2026, 11, 5)]
    [InlineData("05/11/26", 2026, 11, 5)]
    [InlineData("05/11/2026 14:30", 2026, 11, 5)]
    [InlineData("2026-11-05T08:15:00", 2026, 11, 5)]
    [InlineData("  05/11/2026  ", 2026, 11, 5)]
    public void TryParseDate_FormatosHabituales(string raw, int y, int m, int d)
    {
        Assert.True(ImportValueParser.TryParseDate(raw, out var date));
        Assert.Equal(new DateTime(y, m, d), date);
        Assert.Equal(TimeSpan.Zero, date.TimeOfDay); // se descarta la hora
    }

    [Fact]
    public void TryParseDate_FechaSerialDeExcelComoTexto()
    {
        var serial = new DateTime(2026, 11, 5).ToOADate().ToString(System.Globalization.CultureInfo.InvariantCulture);
        Assert.True(ImportValueParser.TryParseDate(serial, out var date));
        Assert.Equal(new DateTime(2026, 11, 5), date);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("31/02/2026")] // día imposible
    [InlineData("hoy")]
    [InlineData("13/13/2026")]
    [InlineData("150")] // número que no es serial de fecha razonable
    public void TryParseDate_RechazaValoresInvalidos(string? raw)
    {
        Assert.False(ImportValueParser.TryParseDate(raw, out _));
    }

    // ---------- Montos ----------

    [Theory]
    [InlineData("38.900", 38900)] // punto de miles (pesos), NO 38,9
    [InlineData("-38.900", -38900)]
    [InlineData("1.234.567", 1234567)]
    [InlineData("1.234.567,89", 1234567.89)]
    [InlineData("$ -1.234.567,89", -1234567.89)]
    [InlineData("1,234,567.89", 1234567.89)] // formato US
    [InlineData("1,234,567", 1234567)]
    [InlineData("38900", 38900)]
    [InlineData("38900.5", 38900.5)]
    [InlineData("38900,5", 38900.5)]
    [InlineData("12,50", 12.5)]
    [InlineData("(12.400)", -12400)] // negativo contable con paréntesis
    [InlineData("5.000-", -5000)] // signo al final
    [InlineData("+5.200.000", 5200000)]
    [InlineData("COP 12.000", 12000)]
    [InlineData("$ 38.900", 38900)] // espacio no separable
    [InlineData("-2.100.000,00", -2100000)]
    public void TryParseAmount_FormatosColombianosYUs(string raw, decimal expected)
    {
        Assert.True(ImportValueParser.TryParseAmount(raw, out var amount));
        Assert.Equal(expected, amount);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("$")]
    [InlineData("1-2")]
    [InlineData("--5")]
    public void TryParseAmount_RechazaValoresInvalidos(string? raw)
    {
        Assert.False(ImportValueParser.TryParseAmount(raw, out _));
    }

    // ---------- Codificación ----------

    [Fact]
    public void DecodeText_Utf8ConBom()
    {
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes("Descripción;Café")).ToArray();
        Assert.Equal("Descripción;Café", ImportValueParser.DecodeText(new MemoryStream(bytes)));
    }

    [Fact]
    public void DecodeText_Latin1CuandoNoEsUtf8Valido()
    {
        var bytes = Encoding.Latin1.GetBytes("Descripción;CAFÉ ÑAME");
        Assert.Equal("Descripción;CAFÉ ÑAME", ImportValueParser.DecodeText(new MemoryStream(bytes)));
    }

    // ---------- Sugerencia de columnas ----------

    [Fact]
    public void SuggestColumns_ReconoceNombresDeBancosColombianos()
    {
        var s = ImportValueParser.SuggestColumns(["FECHA", "Descripción", "Valor", "Saldo"]);
        Assert.Equal("FECHA", s.DateColumn);
        Assert.Equal("Valor", s.AmountColumn);
        Assert.Equal("Descripción", s.DescriptionColumn);
    }

    [Fact]
    public void SuggestColumns_SinAcentosYEnIngles()
    {
        var s = ImportValueParser.SuggestColumns(["Date", "Concepto", "Monto COP"]);
        Assert.Equal("Date", s.DateColumn);
        Assert.Equal("Monto COP", s.AmountColumn);
        Assert.Equal("Concepto", s.DescriptionColumn);
    }

    [Fact]
    public void SuggestColumns_DevuelveNullSiNoReconoce()
    {
        var s = ImportValueParser.SuggestColumns(["A", "B", "C"]);
        Assert.Null(s.DateColumn);
        Assert.Null(s.AmountColumn);
        Assert.Null(s.DescriptionColumn);
    }
}
