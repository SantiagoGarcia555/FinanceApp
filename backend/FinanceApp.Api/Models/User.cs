namespace FinanceApp.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string PreferredCurrency { get; set; } = "COP";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Intentos de login fallidos consecutivos (se reinicia al ingresar bien o al bloquear). US-02.</summary>
    public int FailedLoginAttempts { get; set; }

    /// <summary>Si tiene valor futuro (UTC), el login está bloqueado hasta esa hora. US-02.</summary>
    public DateTime? LockoutEndAt { get; set; }
}
