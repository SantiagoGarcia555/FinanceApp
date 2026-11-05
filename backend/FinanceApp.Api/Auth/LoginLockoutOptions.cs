namespace FinanceApp.Api.Auth;

/// <summary>
/// Bloqueo temporal del login tras intentos fallidos consecutivos (US-02, mitigación de fuerza bruta).
/// Configurable en la sección "Lockout" de appsettings.
/// </summary>
public class LoginLockoutOptions
{
    public const string SectionName = "Lockout";

    public int MaxFailedAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
}
