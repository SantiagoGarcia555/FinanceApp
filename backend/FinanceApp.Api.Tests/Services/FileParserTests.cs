using System.Text;
using ClosedXML.Excel;
using FinanceApp.Api.Services;

namespace FinanceApp.Api.Tests.Services;

/// <summary>Atajos de prueba: leer + analizar + interpretar, como hace el controlador.</summary>
internal static class ParserTestExtensions
{
    public static readonly DateTime Today = new(2026, 11, 6);

    public static IReadOnlyList<ParsedImportRow> Parse(this ITransactionFileParser parser, Stream stream, string date, string amount, string description) =>
        ParseStatement(parser, stream, date, amount, description).Rows;

    public static ParsedStatement ParseStatement(this ITransactionFileParser parser, Stream stream, string date, string amount, string description, string? sheet = null)
    {
        var statement = parser.Read(stream, sheet);
        var layout = StatementReader.Analyze(statement) ?? throw new InvalidOperationException("Archivo vacío.");
        return StatementReader.Parse(statement, layout, new ImportColumnMapping(date, amount, description), Today);
    }

    public static ImportFileSample Sample(this ITransactionFileParser parser, Stream stream, int maxRows)
    {
        var statement = parser.Read(stream);
        var layout = StatementReader.Analyze(statement);
        return layout is null ? new ImportFileSample([], []) : StatementReader.Sample(statement, layout, maxRows);
    }
}

public class CsvTransactionFileParserTests
{
    private readonly CsvTransactionFileParser _parser = new();

    private static MemoryStream Latin1(string text) => new(Encoding.Latin1.GetBytes(text));
    private static MemoryStream Utf8(string text) => new(Encoding.UTF8.GetBytes(text));

    private const string BancoColombiano =
        "Fecha;Descripción;Valor;Saldo\r\n" +
        "05/11/2026;COMPRA CARULLA ÉXITO;-86.500;1.234.567,00\r\n" +
        "04/11/2026;PAGO NÓMINA;5.200.000;0\r\n" +
        "01/11/2026;Café Juan Valdez;(12.400);0\r\n" +
        "31/02/2026;Fecha mala;-1.000;0\r\n" +
        "03/11/2026;;-5.000;0\r\n" +
        "02/11/2026;Monto malo;abc;0\r\n";

    [Theory]
    [InlineData("extracto.csv", true)]
    [InlineData("EXTRACTO.CSV", true)]
    [InlineData("extracto.xlsx", false)]
    [InlineData("extracto.txt", false)]
    public void CanParse_SoloCsv(string fileName, bool expected) => Assert.Equal(expected, _parser.CanParse(fileName));

    [Fact]
    public void Parse_ExtractoColombianoConPuntoYComaYLatin1()
    {
        var rows = _parser.Parse(Latin1(BancoColombiano), "Fecha", "Valor", "Descripción");

        Assert.Equal(6, rows.Count);
        Assert.Equal(new ParsedImportRow(2, new DateTime(2026, 11, 5), -86500m, "COMPRA CARULLA ÉXITO", null), rows[0]);
        Assert.Equal(5200000m, rows[1].Amount);
        Assert.Equal(-12400m, rows[2].Amount);
        Assert.Equal("Café Juan Valdez", rows[2].Description);
    }

    [Fact]
    public void Parse_MarcaErroresPorFilaSinDetenerse()
    {
        var rows = _parser.Parse(Latin1(BancoColombiano), "Fecha", "Valor", "Descripción");

        Assert.Contains("Fecha inválida", rows[3].Error);
        Assert.Equal(5, rows[3].RowNumber);
        Assert.Equal("Descripción vacía.", rows[4].Error);
        Assert.Contains("Monto inválido", rows[5].Error);
        Assert.Equal(3, rows.Count(r => r.Error is null));
    }

    [Fact]
    public void Parse_SeparadorComaConComillasYUtf8()
    {
        const string csv = "date,description,amount\n2026-11-05,\"Uber, viaje\",-18900\n";
        var row = Assert.Single(_parser.Parse(Utf8(csv), "date", "amount", "description"));
        Assert.Equal("Uber, viaje", row.Description);
        Assert.Equal(-18900m, row.Amount);
    }

    [Fact]
    public void Parse_ToleraEspaciosEnEncabezados()
    {
        const string csv = " Fecha ; Valor ; Detalle \n05/11/2026;-1.000;Pan\n";
        var row = Assert.Single(_parser.Parse(Utf8(csv), "Fecha", "Valor", "Detalle"));
        Assert.Equal(-1000m, row.Amount);
    }

    [Fact]
    public void Parse_FallaSiFaltaUnaColumna()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => _parser.Parse(Latin1(BancoColombiano), "Fecha", "Monto", "Descripción"));
        Assert.Contains("columnas", ex.Message);
    }

    [Fact]
    public void Sample_DevuelveEncabezadosYPrimerasFilasComoTexto()
    {
        var sample = _parser.Sample(Latin1(BancoColombiano), maxRows: 2);

        Assert.Equal(["Fecha", "Descripción", "Valor", "Saldo"], sample.Headers);
        Assert.Equal(2, sample.Rows.Count);
        Assert.Equal(["05/11/2026", "COMPRA CARULLA ÉXITO", "-86.500", "1.234.567,00"], sample.Rows[0]);
    }

    [Fact]
    public void Sample_ArchivoVacio()
    {
        var sample = _parser.Sample(Utf8(""), maxRows: 5);
        Assert.Empty(sample.Headers);
        Assert.Empty(sample.Rows);
    }
}

public class ExcelTransactionFileParserTests
{
    private readonly ExcelTransactionFileParser _parser = new();

    /// <summary>Libro con celdas nativas (fecha, número) y celdas de texto con formato local.</summary>
    private static MemoryStream Workbook()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Movimientos");
        ws.Cell(1, 1).Value = "Fecha";
        ws.Cell(1, 2).Value = "Concepto";
        ws.Cell(1, 3).Value = "Valor";

        ws.Cell(2, 1).Value = new DateTime(2026, 11, 5); // fecha nativa
        ws.Cell(2, 2).Value = "Rappi";
        ws.Cell(2, 3).Value = -38900; // número nativo

        ws.Cell(3, 1).Value = "04/11/2026"; // fecha como texto (día/mes)
        ws.Cell(3, 2).Value = "Arriendo";
        ws.Cell(3, 3).Value = "$ -2.100.000"; // monto como texto local

        ws.Cell(4, 1).Value = "no es fecha";
        ws.Cell(4, 2).Value = "Fila mala";
        ws.Cell(4, 3).Value = -1;

        ws.Cell(5, 1).Value = new DateTime(2026, 11, 3);
        ws.Cell(5, 2).Value = "";
        ws.Cell(5, 3).Value = -5000;

        var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    [Theory]
    [InlineData("extracto.xlsx", true)]
    [InlineData("extracto.csv", false)]
    [InlineData("extracto.xls", false)]
    public void CanParse_SoloXlsx(string fileName, bool expected) => Assert.Equal(expected, _parser.CanParse(fileName));

    [Fact]
    public void Parse_CeldasNativasYTextoLocal()
    {
        var rows = _parser.Parse(Workbook(), "Fecha", "Valor", "Concepto");

        Assert.Equal(4, rows.Count);
        Assert.Equal(new ParsedImportRow(2, new DateTime(2026, 11, 5), -38900m, "Rappi", null), rows[0]);
        Assert.Equal(new ParsedImportRow(3, new DateTime(2026, 11, 4), -2100000m, "Arriendo", null), rows[1]);
    }

    [Fact]
    public void Parse_MarcaErroresPorFila()
    {
        var rows = _parser.Parse(Workbook(), "Fecha", "Valor", "Concepto");
        Assert.Equal("Fecha inválida: 'no es fecha'.", rows[2].Error);
        Assert.Equal("Descripción vacía.", rows[3].Error);
    }

    [Fact]
    public void Parse_FallaSiFaltaUnaColumna()
    {
        Assert.Throws<InvalidOperationException>(() => _parser.Parse(Workbook(), "Fecha", "Monto", "Concepto"));
    }

    [Fact]
    public void Sample_DevuelveEncabezadosYFilas()
    {
        var sample = _parser.Sample(Workbook(), maxRows: 2);
        Assert.Equal(["Fecha", "Concepto", "Valor"], sample.Headers);
        Assert.Equal(2, sample.Rows.Count);
        Assert.Equal("Rappi", sample.Rows[0][1]);
        Assert.Equal("Arriendo", sample.Rows[1][1]);
    }
}
