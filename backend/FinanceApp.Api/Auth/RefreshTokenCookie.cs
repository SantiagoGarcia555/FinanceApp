namespace FinanceApp.Api.Auth;

/// <summary>
/// Transporte del refresh token para clientes navegador.
///
/// El cliente web envía el header <c>X-Auth-Transport: cookie</c> en login/registro/refresh/logout:
/// la API guarda el refresh token en una cookie HttpOnly (inaccesible desde JavaScript, así un XSS
/// no puede robarlo) y lo omite del body. Clientes sin el header (app móvil) siguen recibiéndolo
/// en el body, porque lo guardan en almacenamiento seguro del sistema (SecureStore/Keychain).
/// </summary>
public static class RefreshTokenCookie
{
    public const string Name = "fa_refresh";
    public const string TransportHeader = "X-Auth-Transport";

    /// <summary>Solo viaja a los endpoints de auth, nunca al resto de la API.</summary>
    private const string CookiePath = "/api/auth";

    public static bool IsRequested(HttpRequest request) =>
        string.Equals(request.Headers[TransportHeader], "cookie", StringComparison.OrdinalIgnoreCase);

    public static string? Read(HttpRequest request) =>
        request.Cookies.TryGetValue(Name, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

    public static void Write(HttpResponse response, string token, DateTime expiresAtUtc) =>
        response.Cookies.Append(Name, token, Options(expiresAtUtc));

    public static void Delete(HttpResponse response) =>
        response.Cookies.Delete(Name, Options(null));

    private static CookieOptions Options(DateTime? expiresAtUtc) => new()
    {
        HttpOnly = true,
        // Los navegadores aceptan cookies Secure en http://localhost, así funciona también con el dev server de Vite.
        Secure = true,
        // Strict: el navegador no la envía en peticiones originadas desde otros sitios (mitiga CSRF sobre /refresh y /logout).
        SameSite = SameSiteMode.Strict,
        Path = CookiePath,
        IsEssential = true,
        Expires = expiresAtUtc,
    };
}
