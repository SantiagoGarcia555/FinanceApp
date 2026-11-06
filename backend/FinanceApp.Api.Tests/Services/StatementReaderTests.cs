using System.Text;
using FinanceApp.Api.Services;

namespace FinanceApp.Api.Tests.Services;

/// <summary>Extractos reales (estructura Bancolombia): encabezado desplazado, secciones, fechas sin año, varias hojas.</summary>
public class StatementReaderTests
{
    private readonly ExcelTransactionFileParser _excel = new();

    // ---------- Cuenta de ahorros ----------

    [Fact]
    public void Ahorros_EncuentraElEncabezadoDebajoDelBloqueDelCliente()
    {
        var statement = _excel.Read(StatementFixtures.SavingsAccount());
        var layout = StatementReader.Analyze(statement)!;

        Assert.Equal(12, statement.Rows[layout.HeaderIndex].RowNumber);
        Assert.Equal(["FECHA", "DESCRIPCIÓN", "SUCURSAL", "DCTO.", "VALOR", "SALDO"], layout.Columns.Select(c => c.Name));
        Assert.Equal(new StatementPeriod(new DateTime(2026, 6, 30), new DateTime(2026, 9, 30)), layout.Period);
        Assert.Null(layout.Currency);
        Assert.False(layout.LooksLikeCreditCard);
    }

    [Fact]
    public void Ahorros_IgnoraBloquesRepetidosYCierre_SinErrores()
    {
        var parsed = _excel.ParseStatement(StatementFixtures.SavingsAccount(), "FECHA", "VALOR", "DESCRIPCIÓN");

        Assert.Equal(6, parsed.Rows.Count);
        Assert.All(parsed.Rows, r => Assert.Null(r.Error));
        // bloque del cliente (6) + "Movimientos:" + encabezado repetido + "FIN ESTADO DE CUENTA"
        Assert.Equal(9, parsed.IgnoredRows);
        Assert.Equal(-30_000m, parsed.Rows[0].Amount);
        Assert.Equal(0.37m, parsed.Rows[1].Amount);
        Assert.Equal(1_443_063m, parsed.Rows[2].Amount);
    }

    [Fact]
    public void Ahorros_DeduceElAnioDelPeriodoDelExtracto()
    {
        var parsed = _excel.ParseStatement(StatementFixtures.SavingsAccount(), "FECHA", "VALOR", "DESCRIPCIÓN");

        Assert.All(parsed.Rows, r => Assert.True(r.YearInferred));
        Assert.Equal(new DateTime(2026, 7, 1), parsed.Rows[0].Date);
        Assert.Equal(new DateTime(2026, 9, 30), parsed.Rows[^1].Date);
    }

    [Fact]
    public void Ahorros_PeriodoQueCruzaDiciembreEnero()
    {
        var parsed = _excel.ParseStatement(
            StatementFixtures.SavingsAccount("2026/11/30", "2027/02/28", ("15/12", "COMPRA DICIEMBRE", "-10,000.00"), ("10/01", "COMPRA ENERO", "-20,000.00")),
            "FECHA", "VALOR", "DESCRIPCIÓN");

        Assert.Equal(new DateTime(2026, 12, 15), parsed.Rows[0].Date);
        Assert.Equal(new DateTime(2027, 1, 10), parsed.Rows[1].Date);
    }

    [Fact]
    public void Ahorros_SinPeriodoUsaLaFechaMasRecienteNoFutura()
    {
        // Sin DESDE/HASTA válidos: hoy (fixture) = 2026-11-06 → "20/12" es de 2025, "1/11" de 2026.
        var parsed = _excel.ParseStatement(
            StatementFixtures.SavingsAccount("", "", ("1/11", "RECIENTE", "-1,000.00"), ("20/12", "DICIEMBRE PASADO", "-2,000.00")),
            "FECHA", "VALOR", "DESCRIPCIÓN");

        Assert.Equal(new DateTime(2026, 11, 1), parsed.Rows[0].Date);
        Assert.Equal(new DateTime(2025, 12, 20), parsed.Rows[1].Date);
    }

    [Fact]
    public void Ahorros_MuestraSaltaLosBloquesRepetidos()
    {
        var statement = _excel.Read(StatementFixtures.SavingsAccount());
        var sample = StatementReader.Sample(statement, StatementReader.Analyze(statement)!, maxRows: 5);

        Assert.Equal(5, sample.Rows.Count);
        Assert.Equal("1/09", sample.Rows[3][0]); // tras el salto de página, sin el bloque del cliente
        Assert.All(sample.Rows, r => Assert.NotEqual("FECHA", r[0]));
    }

    // ---------- Tarjeta de crédito ----------

    [Fact]
    public void Tarjeta_ListaHojasYLeeLaPrimeraPorDefecto()
    {
        var statement = _excel.Read(StatementFixtures.CreditCard());
        var layout = StatementReader.Analyze(statement)!;

        Assert.Equal(["PESOS", "DOLARES"], statement.SheetNames);
        Assert.Equal("PESOS", statement.SheetName);
        Assert.Equal("COP", layout.Currency);
        Assert.True(layout.LooksLikeCreditCard);
        Assert.Null(layout.Period);
    }

    [Fact]
    public void Tarjeta_SugiereMovimientosComoDescripcion()
    {
        var statement = _excel.Read(StatementFixtures.CreditCard());
        var s = ImportValueParser.SuggestColumns(StatementReader.Analyze(statement)!.Columns.Select(c => c.Name).ToList());

        Assert.Equal("Fecha", s.DateColumn);
        Assert.Equal("Valor Movimiento", s.AmountColumn);
        Assert.Equal("Movimientos", s.DescriptionColumn);
    }

    [Fact]
    public void Tarjeta_SaltaLaSeccionMovimientosAntesDelPeriodo()
    {
        var parsed = _excel.ParseStatement(StatementFixtures.CreditCard(), "Fecha", "Valor Movimiento", "Movimientos");

        Assert.Equal(["INTERESES CORRIENTES", "Didi", "ABONO SUCURSAL VIRTUAL"], parsed.Rows.Select(r => r.Description));
        Assert.DoesNotContain(parsed.Rows, r => r.Description == "AMPLIACION DE PLAZO");
        Assert.Equal(92_214.12m, parsed.Rows[0].Amount);
        Assert.False(parsed.Rows[0].YearInferred);
    }

    [Fact]
    public void Tarjeta_HojaEnDolares_DetectaMonedaEIgnoraContinuaciones()
    {
        var statement = _excel.Read(StatementFixtures.CreditCard(), "dolares"); // sin distinguir mayúsculas
        var layout = StatementReader.Analyze(statement)!;
        var parsed = StatementReader.Parse(statement, layout, new ImportColumnMapping("Fecha", "Valor Movimiento", "Movimientos"), ParserTestExtensions.Today);

        Assert.Equal("DOLARES", statement.SheetName);
        Assert.Equal("USD", layout.Currency);
        Assert.Equal(2, parsed.Rows.Count);
        Assert.All(parsed.Rows, r => Assert.Null(r.Error));
        Assert.Equal(2.60m, parsed.Rows[0].Amount);
    }

    [Fact]
    public void Tarjeta_HojaInexistente_Lanza()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => _excel.Read(StatementFixtures.CreditCard(), "EUROS"));
        Assert.Contains("EUROS", ex.Message);
    }

    // ---------- CSV con filas previas ----------

    [Fact]
    public void Csv_ConFilasDeResumenAntesDelEncabezado()
    {
        const string csv =
            "Banco de prueba;;\n" +
            "Desde: 2026/06/30;Hasta: 2026/09/30;\n" +
            "Fecha;Concepto;Valor\n" +
            "3/07;Mercado;-45.000\n" +
            "Total;;-45.000\n";

        var parser = new CsvTransactionFileParser();
        var parsed = parser.ParseStatement(new MemoryStream(Encoding.UTF8.GetBytes(csv)), "Fecha", "Valor", "Concepto");

        var row = parsed.Rows[0];
        Assert.Equal(new DateTime(2026, 7, 3), row.Date);
        Assert.True(row.YearInferred);
        Assert.Equal(4, row.RowNumber);
        // "Total;;-45.000" tiene monto sin fecha: es fila de datos con error, no se oculta
        Assert.Contains("Fecha inválida", parsed.Rows[1].Error);
    }

    [Fact]
    public void FilaConSoloUnoDeFechaOMonto_EsErrorVisible()
    {
        var parsed = _excel.ParseStatement(
            StatementFixtures.SavingsAccount("2026/06/30", "2026/09/30", ("5/07", "SIN MONTO", "abc"), ("6/07", "OK", "-1,000.00")),
            "FECHA", "VALOR", "DESCRIPCIÓN");

        Assert.Equal("Monto inválido: 'abc'.", parsed.Rows[0].Error);
        Assert.True(parsed.Rows[0].YearInferred);
        Assert.Null(parsed.Rows[1].Error);
    }
}
