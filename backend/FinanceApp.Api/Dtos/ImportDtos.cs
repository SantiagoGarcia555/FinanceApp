namespace FinanceApp.Api.Dtos;

public record ImportRowPreview(
    int RowNumber,
    DateTime? Date,
    decimal? Amount,
    string? Description,
    bool IsDuplicate,
    string? Error);

public record ImportPreviewResponse(
    int TotalRows,
    int ValidRows,
    int ErrorRows,
    int DuplicateRows,
    IReadOnlyList<ImportRowPreview> Rows);

public record ImportConfirmRow(DateTime Date, decimal Amount, string Description, Guid? CategoryId);

public record ImportConfirmRequest(Guid? AccountId, IReadOnlyList<ImportConfirmRow> Rows);

public record ImportConfirmResponse(int ImportedCount, IReadOnlyList<TransactionResponse> Transactions);
