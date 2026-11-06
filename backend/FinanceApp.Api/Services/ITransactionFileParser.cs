namespace FinanceApp.Api.Services;

/// <summary>Fila cruda parseada del archivo importado, antes de validar contra la BD (cuenta/categoría/duplicados).</summary>
/// <param name="YearInferred">La fecha venía sin año ("1/07") y se dedujo del periodo del extracto o de la fecha actual.</param>
public record ParsedImportRow(int RowNumber, DateTime? Date, decimal? Amount, string? Description, string? Error, bool YearInferred = false);

/// <summary>Encabezados y primeras filas (como texto) para que el usuario elija el mapeo de columnas.</summary>
public record ImportFileSample(IReadOnlyList<string> Headers, IReadOnlyList<IReadOnlyList<string>> Rows);

/// <summary>Periodo que declara el extracto (p. ej. "DESDE 2026/06/30 HASTA 2026/09/30").</summary>
public record StatementPeriod(DateTime Start, DateTime End);

/// <summary>
/// Celda tal como viene del archivo: texto visible y, si el formato lo distingue (Excel), el valor nativo.
/// </summary>
public record SheetCell(string Text, DateTime? Date = null, decimal? Number = null)
{
    public static readonly SheetCell Empty = new(string.Empty);

    public bool IsEmpty => Date is null && Number is null && string.IsNullOrWhiteSpace(Text);
}

/// <summary>Fila del archivo con su número visible para el usuario (fila de Excel o registro del CSV, base 1).</summary>
public record SheetRow(int RowNumber, IReadOnlyList<SheetCell> Cells)
{
    public SheetCell this[int column] => column < Cells.Count ? Cells[column] : SheetCell.Empty;
}

/// <summary>Hoja leída: nombres de todas las hojas del archivo, la elegida y sus filas no vacías.</summary>
public record StatementSheet(IReadOnlyList<string> SheetNames, string? SheetName, IReadOnlyList<SheetRow> Rows);

/// <summary>
/// Lee un archivo de extracto (CSV o Excel) a una grilla de celdas (US-10: soporta .csv y .xlsx).
/// Solo sabe del formato del archivo; la interpretación (encabezado desplazado, secciones, fechas sin año…)
/// es común a todos los formatos y vive en <see cref="StatementReader"/>. Nuevo formato = nueva clase.
/// </summary>
public interface ITransactionFileParser
{
    bool CanParse(string fileName);

    /// <param name="sheetName">Hoja a leer (null = la primera). Formatos sin hojas lo ignoran.</param>
    /// <exception cref="InvalidOperationException">La hoja pedida no existe.</exception>
    StatementSheet Read(Stream fileStream, string? sheetName = null);
}
