namespace FinanceApp.Api.Dtos;

public record CategoryRequest(string Name, string? Icon);

public record CategoryResponse(Guid Id, string Name, string? Icon, bool IsSystemDefined, bool IsHidden);
