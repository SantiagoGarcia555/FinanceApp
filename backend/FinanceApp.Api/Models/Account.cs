namespace FinanceApp.Api.Models;

public enum AccountType
{
    Cash,
    Bank,
    Card,
}

public enum AccountOrigin
{
    Manual,
    OpenBanking, // fase futura: Belvo / Salt Edge / TrueLayer
}

public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public AccountOrigin Origin { get; set; } = AccountOrigin.Manual;

    /// <summary>Id de la cuenta en el agregador de Open Banking. Nulable — solo aplica desde la Fase 3.</summary>
    public string? BankProviderRef { get; set; }
}
