namespace FinanceApp.Api.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Clave simétrica para firmar los access tokens (HMAC-SHA256, mínimo 32 bytes).
    /// El valor de appsettings.json es un placeholder — el real vive en
    /// appsettings.Development.json (gitignored) o en variables de entorno en producción.
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
}
