using System.Globalization;

namespace FinanceApp.Api.Services;

/// <summary>Columna del encabezado detectado: nombre visible e índice (base 0) dentro de la fila.</summary>
public record StatementColumn(string Name, int Index);

/// <summary>Columnas que el usuario eligió para fecha, monto y descripción (por nombre de encabezado).</summary>
public record ImportColumnMapping(string DateColumn, string AmountColumn, string DescriptionColumn);

/// <summary>
/// Estructura detectada en la hoja: dónde está el encabezado real, qué periodo y moneda declara el extracto
/// en las filas de arriba, y si parece una tarjeta de crédito (cargos en positivo).
/// </summary>
/// <param name="HeaderIndex">Índice en <see cref="StatementSheet.Rows"/> (no el número de fila visible).</param>
public record StatementLayout(
    int HeaderIndex,
    IReadOnlyList<StatementColumn> Columns,
    StatementPeriod? Period,
    string? Currency,
    bool LooksLikeCreditCard);

/// <summary>Filas de movimientos interpretadas y cuántas filas se ignoraron por no ser movimientos.</summary>
public record ParsedStatement(IReadOnlyList<ParsedImportRow> Rows, int IgnoredRows);

/// <summary>
/// Interpreta la grilla de un extracto real, que casi nunca es una tabla limpia. Lo que resuelve
/// (casos tomados de los extractos de Bancolombia en Excel):
/// <list type="bullet">
/// <item>Encabezado desplazado: arriba vienen datos del cliente, resumen, tasas… Se busca la primera fila
/// que tenga columnas reconocibles de fecha, monto y descripción.</item>
/// <item>Encabezado y bloque del cliente repetidos en cada página, y filas de cierre ("FIN ESTADO DE CUENTA"):
/// se ignoran, no cuentan como error.</item>
/// <item>Secciones que no son movimientos del periodo ("Movimientos antes del periodo" en tarjetas): se saltan.</item>
/// <item>Fechas sin año ("1/07"): el año sale del periodo DESDE/HASTA del extracto o, si no lo hay, de hoy.</item>
/// <item>Moneda de la hoja ("Moneda: DOLARES") para no mezclar USD con pesos.</item>
/// </list>
/// </summary>
public static class StatementReader
{
    /// <summary>Hasta dónde se busca el encabezado real (el de Bancolombia TC está en la fila 24).</summary>
    private const int HeaderSearchRows = 60;

    /// <summary>
    /// Títulos de sección cuyos movimientos no son del periodo. En las tarjetas Bancolombia, "Movimientos antes
    /// del periodo" lista compras ya facturadas (p. ej. "AMPLIACION DE PLAZO" = refinanciación); importarlas
    /// inflaría el gasto del mes.
    /// </summary>
    private static readonly string[] SkippedSectionMarkers = ["antes del periodo"];

    /// <returns>null si la hoja no tiene filas o el encabezado no tiene ninguna columna con nombre.</returns>
    public static StatementLayout? Analyze(StatementSheet sheet)
    {
        if (sheet.Rows.Count == 0)
            return null;

        var headerIndex = FindHeaderIndex(sheet.Rows);
        var headerRow = sheet.Rows[headerIndex];

        var columns = new List<StatementColumn>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        for (var i = 0; i < headerRow.Cells.Count; i++)
        {
            var name = headerRow.Cells[i].Text.Trim();
            if (name.Length > 0 && seen.Add(name))
                columns.Add(new StatementColumn(name, i));
        }

        if (columns.Count == 0)
            return null;

        var preamble = sheet.Rows.Take(headerIndex).ToList();
        var looksLikeCreditCard = columns
            .Select(c => ImportValueParser.Normalize(c.Name))
            .Any(n => n.Contains("cuota") || n.Contains("autorizacion"));

        return new StatementLayout(headerIndex, columns, FindPeriod(preamble), FindCurrency(preamble), looksLikeCreditCard);
    }

    /// <summary>Encabezados y primeras filas de movimientos (texto visible), saltando bloques repetidos.</summary>
    public static ImportFileSample Sample(StatementSheet sheet, StatementLayout layout, int maxRows)
    {
        var headers = layout.Columns.Select(c => c.Name).ToList();
        var suggestion = ImportValueParser.SuggestColumns(headers);

        var rows = Walk(sheet, layout, IndexOf(layout, suggestion.DateColumn), IndexOf(layout, suggestion.AmountColumn), IndexOf(layout, suggestion.DescriptionColumn))
            .Where(r => r.IsData)
            .Take(maxRows)
            .Select(r => (IReadOnlyList<string>)layout.Columns.Select(c => r.Row[c.Index].Text.Trim()).ToList())
            .ToList();

        return new ImportFileSample(headers, rows);
    }

    /// <param name="referenceDate">"Hoy", para fechas sin año cuando el extracto no declara periodo.</param>
    /// <exception cref="InvalidOperationException">Alguna columna del mapeo no está en el encabezado.</exception>
    public static ParsedStatement Parse(StatementSheet sheet, StatementLayout layout, ImportColumnMapping mapping, DateTime referenceDate)
    {
        int Column(string name) => IndexOf(layout, name)
            ?? throw new InvalidOperationException("No se encontraron todas las columnas indicadas en el encabezado del archivo.");

        var dateCol = Column(mapping.DateColumn);
        var amountCol = Column(mapping.AmountColumn);
        var descCol = Column(mapping.DescriptionColumn);

        var rows = new List<ParsedImportRow>();
        var ignored = 0;

        foreach (var (row, isData) in Walk(sheet, layout, dateCol, amountCol, descCol))
        {
            if (isData)
                rows.Add(ParseRow(row, dateCol, amountCol, descCol, layout.Period, referenceDate));
            else
                ignored++;
        }

        return new ParsedStatement(rows, ignored);
    }

    // ---------- Recorrido por secciones ----------

    /// <summary>
    /// Recorre las filas debajo del encabezado decidiendo cuáles son movimientos. Una fila sin fecha ni monto
    /// es continuación (solo texto en la columna de descripción, p. ej. "VR MONEDA ORIG…") o cambio de sección
    /// (bloque del cliente, resumen…); tras un cambio de sección se ignora todo hasta que el encabezado se repita.
    /// Sin columnas de fecha/monto conocidas (sugerencia vacía) solo se descartan los encabezados repetidos.
    /// </summary>
    private static IEnumerable<(SheetRow Row, bool IsData)> Walk(StatementSheet sheet, StatementLayout layout, int? dateCol, int? amountCol, int? descCol)
    {
        var inTable = true;
        var skipping = false;

        for (var i = layout.HeaderIndex + 1; i < sheet.Rows.Count; i++)
        {
            var row = sheet.Rows[i];

            if (IsHeaderRepeat(row, layout))
            {
                inTable = !skipping;
                yield return (row, false);
                continue;
            }

            if (dateCol is null || amountCol is null)
            {
                yield return (row, inTable);
                continue;
            }

            if (LooksLikeDate(row[dateCol.Value]) || TryReadAmount(row[amountCol.Value], out _))
            {
                yield return (row, inTable);
                continue;
            }

            var onlyDescription = row.Cells
                .Select((cell, index) => (cell, index))
                .All(x => x.cell.IsEmpty || x.index == descCol);

            if (!onlyDescription)
            {
                inTable = false;
                var text = ImportValueParser.Normalize(string.Join(' ', row.Cells.Select(c => c.Text)));
                skipping = SkippedSectionMarkers.Any(text.Contains);
            }

            yield return (row, false);
        }
    }

    private static bool IsHeaderRepeat(SheetRow row, StatementLayout layout) =>
        layout.Columns.All(c => ImportValueParser.Normalize(row[c.Index].Text) == ImportValueParser.Normalize(c.Name));

    private static int? IndexOf(StatementLayout layout, string? name) =>
        name is null ? null : layout.Columns.FirstOrDefault(c => c.Name == name.Trim())?.Index;

    // ---------- Detección de encabezado, periodo y moneda ----------

    /// <summary>Primera fila con fecha + monto + descripción reconocibles; si no hay, la primera con dos de tres; si no, la primera.</summary>
    private static int FindHeaderIndex(IReadOnlyList<SheetRow> rows)
    {
        int? partial = null;

        for (var i = 0; i < Math.Min(rows.Count, HeaderSearchRows); i++)
        {
            var names = rows[i].Cells.Select(c => c.Text.Trim()).Where(t => t.Length > 0).ToList();
            var s = ImportValueParser.SuggestColumns(names);
            var found = new[] { s.DateColumn, s.AmountColumn, s.DescriptionColumn }.OfType<string>().Distinct().Count();

            if (found == 3)
                return i;
            if (found == 2)
                partial ??= i;
        }

        return partial ?? 0;
    }

    private static StatementPeriod? FindPeriod(IReadOnlyList<SheetRow> preamble)
    {
        var start = FindLabeledDate(preamble, "desde");
        var end = FindLabeledDate(preamble, "hasta");
        return start is not null && end is not null && start <= end ? new StatementPeriod(start.Value, end.Value) : null;
    }

    /// <summary>Fecha junto a una etiqueta: en la misma celda ("DESDE: 2026/06/30"), a la derecha o debajo (tabla de etiquetas).</summary>
    private static DateTime? FindLabeledDate(IReadOnlyList<SheetRow> rows, string label)
    {
        for (var r = 0; r < rows.Count; r++)
        {
            for (var c = 0; c < rows[r].Cells.Count; c++)
            {
                var text = ImportValueParser.Normalize(rows[r].Cells[c].Text);
                if (!text.StartsWith(label, StringComparison.Ordinal))
                    continue;

                if (ImportValueParser.TryParseDate(text[label.Length..].TrimStart(':', ' '), out var date) ||
                    TryReadFullDate(rows[r][c + 1], out date) ||
                    (r + 1 < rows.Count && TryReadFullDate(rows[r + 1][c], out date)))
                {
                    return date;
                }
            }
        }

        return null;
    }

    private static string? FindCurrency(IReadOnlyList<SheetRow> preamble)
    {
        foreach (var row in preamble)
        {
            for (var c = 0; c < row.Cells.Count; c++)
            {
                var text = ImportValueParser.Normalize(row.Cells[c].Text);
                if (!text.StartsWith("moneda", StringComparison.Ordinal))
                    continue;

                var inline = text["moneda".Length..].TrimStart(':', ' ');
                if (inline.Length > 0)
                    return ImportValueParser.NormalizeCurrency(inline);

                var next = row.Cells.Skip(c + 1).FirstOrDefault(x => !x.IsEmpty);
                if (next is not null)
                    return ImportValueParser.NormalizeCurrency(next.Text);
            }
        }

        return null;
    }

    // ---------- Valores de celda ----------

    private static ParsedImportRow ParseRow(SheetRow row, int dateCol, int amountCol, int descCol, StatementPeriod? period, DateTime referenceDate)
    {
        var description = row[descCol].Text.Trim();
        var dateCell = row[dateCol];
        var amountCell = row[amountCol];

        var hasDate = TryReadDate(dateCell, period, referenceDate, out var date, out var yearInferred);
        var hasAmount = TryReadAmount(amountCell, out var amount);

        if (!hasDate)
        {
            var error = string.IsNullOrWhiteSpace(dateCell.Text) ? "Fecha inválida o vacía." : $"Fecha inválida: '{dateCell.Text.Trim()}'.";
            return new ParsedImportRow(row.RowNumber, null, hasAmount ? amount : null, description, error);
        }

        if (!hasAmount)
        {
            var error = string.IsNullOrWhiteSpace(amountCell.Text) ? "Monto inválido o vacío." : $"Monto inválido: '{amountCell.Text.Trim()}'.";
            return new ParsedImportRow(row.RowNumber, date, null, description, error, yearInferred);
        }

        if (description.Length == 0)
            return new ParsedImportRow(row.RowNumber, date, amount, description, "Descripción vacía.", yearInferred);

        return new ParsedImportRow(row.RowNumber, date, amount, description, null, yearInferred);
    }

    /// <summary>Celda fecha nativa, número serial de Excel, texto con año ("05/11/2026") o sin año ("1/07").</summary>
    private static bool TryReadDate(SheetCell cell, StatementPeriod? period, DateTime referenceDate, out DateTime date, out bool yearInferred)
    {
        yearInferred = false;

        if (TryReadFullDate(cell, out date))
            return true;

        if (ImportValueParser.TryParseDayMonth(cell.Text, out var day, out var month) &&
            ImportValueParser.ResolveYear(day, month, period, referenceDate, out date))
        {
            yearInferred = true;
            return true;
        }

        return false;
    }

    private static bool TryReadFullDate(SheetCell cell, out DateTime date)
    {
        if (cell.Date is not null)
        {
            date = cell.Date.Value.Date;
            return true;
        }

        if (cell.Number is not null)
            return ImportValueParser.TryParseDate(cell.Number.Value.ToString(CultureInfo.InvariantCulture), out date);

        return ImportValueParser.TryParseDate(cell.Text, out date);
    }

    private static bool LooksLikeDate(SheetCell cell) =>
        TryReadFullDate(cell, out _) || ImportValueParser.TryParseDayMonth(cell.Text, out _, out _);

    /// <summary>Celda numérica nativa o texto con formato local ("$ -38.900", "-30,000.00"). No usa la cultura del servidor.</summary>
    private static bool TryReadAmount(SheetCell cell, out decimal amount)
    {
        if (cell.Number is not null)
        {
            amount = cell.Number.Value;
            return true;
        }

        return ImportValueParser.TryParseAmount(cell.Text, out amount);
    }
}
