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

    // ---------- Fechas sin año (extractos Bancolombia ahorros: "1/07") ----------

    [Theory]
    [InlineData("1/07", 1, 7)]
    [InlineData("30/09", 30, 9)]
    [InlineData(" 05-12 ", 5, 12)]
    public void TryParseDayMonth_DiaPrimero(string raw, int day, int month)
    {
        Assert.True(ImportValueParser.TryParseDayMonth(raw, out var d, out var m));
        Assert.Equal((day, month), (d, m));
    }

    [Theory]
    [InlineData("1/13")]
    [InlineData("32/01")]
    [InlineData("0/05")]
    [InlineData("05/11/2026")] // con año: no es día/mes
    [InlineData("1.07")]
    [InlineData("")]
    [InlineData(null)]
    public void TryParseDayMonth_RechazaValoresInvalidos(string? raw) =>
        Assert.False(ImportValueParser.TryParseDayMonth(raw, out _, out _));

    [Fact]
    public void TryParseDate_NoAceptaFechasSinAnio()
    {
        // TryParseDate no debe inventar el año actual: eso lo decide ResolveYear con el periodo.
        Assert.False(ImportValueParser.TryParseDate("1/07", out _));
    }

    private static readonly DateTime Today = new(2026, 11, 6);

    [Theory]
    [InlineData(15, 12, 2026, 12, 15)] // periodo nov 2026 – feb 2027
    [InlineData(10, 1, 2027, 1, 10)]
    [InlineData(28, 11, 2026, 11, 28)] // holgura: 2 días antes del inicio
    public void ResolveYear_ConPeriodoQueCruzaElAnio(int day, int month, int y, int m, int d)
    {
        var period = new StatementPeriod(new DateTime(2026, 11, 30), new DateTime(2027, 2, 28));
        Assert.True(ImportValueParser.ResolveYear(day, month, period, Today, out var date));
        Assert.Equal(new DateTime(y, m, d), date);
    }

    [Theory]
    [InlineData(6, 11, 2026)] // hoy
    [InlineData(1, 1, 2026)]
    [InlineData(7, 11, 2025)] // mañana → sería futura, va al año anterior
    [InlineData(31, 12, 2025)]
    public void ResolveYear_SinPeriodo_FechaMasRecienteNoFutura(int day, int month, int year)
    {
        Assert.True(ImportValueParser.ResolveYear(day, month, null, Today, out var date));
        Assert.Equal(new DateTime(year, month, day), date);
    }

    [Fact]
    public void ResolveYear_29DeFebrero()
    {
        var period = new StatementPeriod(new DateTime(2028, 1, 1), new DateTime(2028, 3, 31));
        Assert.True(ImportValueParser.ResolveYear(29, 2, period, Today, out var leap));
        Assert.Equal(new DateTime(2028, 2, 29), leap);

        // 2026 no es bisiesto y 2025 tampoco: no hay fecha válida.
        Assert.False(ImportValueParser.ResolveYear(29, 2, null, Today, out _));
        Assert.False(ImportValueParser.ResolveYear(31, 4, null, Today, out _)); // 31 de abril
    }

    [Theory]
    [InlineData("DOLARES", "USD")]
    [InlineData("Dólares", "USD")]
    [InlineData("usd", "USD")]
    [InlineData("PESOS", "COP")]
    [InlineData("COP", "COP")]
    [InlineData("Euros", "EUR")]
    [InlineData("mxn", "MXN")]
    [InlineData("  ", null)]
    public void NormalizeCurrency_ACodigoIso(string raw, string? expected) =>
        Assert.Equal(expected, ImportValueParser.NormalizeCurrency(raw));

    [Fact]
    public void SuggestColumns_TarjetaBancolombia_MovimientosEsLaDescripcion()
    {
        var s = ImportValueParser.SuggestColumns(["Número de autorización", "Fecha", "Movimientos", "Valor Movimiento", "Número de cuotas"]);
        Assert.Equal("Movimientos", s.DescriptionColumn);
        Assert.Equal("Valor Movimiento", s.AmountColumn);
    }

    [Theory]
    [InlineData("-30,000.00", -30000)] // ahorros Bancolombia (formato US)
    [InlineData(".37", 0.37)]
    [InlineData("4.342.466,00", 4342466)] // tarjeta Bancolombia (formato local)
    [InlineData("-453.766,00", -453766)]
    public void TryParseAmount_FormatosDeExtractosBancolombia(string raw, decimal expected)
    {
        Assert.True(ImportValueParser.TryParseAmount(raw, out var amount));
        Assert.Equal(expected, amount);
    }
}
