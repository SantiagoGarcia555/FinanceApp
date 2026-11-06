using Npgsql;

namespace FinanceApp.Api.Hosting;

/// <summary>
/// Ajustes de configuración para correr fuera de la máquina de desarrollo (1.4.2: Render + Neon).
/// Funciones puras para poder testearlas sin levantar la app.
/// </summary>
public static class DeploymentSettings
{
    /// <summary>Valor de relleno que trae appsettings.json; nunca debe firmar tokens reales.</summary>
    public const string PlaceholderJwtSecret = "REEMPLAZAR_EN_appsettings.Development.json_O_VARIABLE_DE_ENTORNO_MIN_32_CHARS";

    /// <summary>HMAC-SHA256 necesita al menos 256 bits de clave.</summary>
    public const int MinJwtSecretLength = 32;

    /// <summary>
    /// Falla al arrancar si la clave JWT falta, es la de relleno o es corta. En desarrollo se tolera
    /// la de relleno (tests/arranque rápido); en cualquier otro entorno firmar con una clave pública
    /// permitiría a cualquiera fabricar tokens válidos.
    /// </summary>
    /// <exception cref="InvalidOperationException">Clave inválida para este entorno.</exception>
    public static string ValidateJwtSecret(string? secret, bool isDevelopment)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Falta configurar Jwt:SecretKey (variable de entorno Jwt__SecretKey).");

        if (isDevelopment)
            return secret;

        if (secret == PlaceholderJwtSecret)
            throw new InvalidOperationException("Jwt:SecretKey tiene el valor de relleno de appsettings.json: define Jwt__SecretKey en el entorno.");

        if (secret.Length < MinJwtSecretLength)
            throw new InvalidOperationException($"Jwt:SecretKey debe tener al menos {MinJwtSecretLength} caracteres.");

        return secret;
    }

    /// <summary>
    /// Acepta la cadena en formato Npgsql ("Host=…;Username=…") o como URI de Postgres, que es lo que
    /// entregan Neon/Render/Railway ("postgresql://user:pass@host/db?sslmode=require"). Npgsql no entiende
    /// URIs, así que se convierten. Los parámetros de la query se mapean a sus equivalentes de Npgsql.
    /// </summary>
    public static string NormalizeConnectionString(string connectionString)
    {
        var value = connectionString.Trim();
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
        };

        foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = pair.Split('=', 2);
            var key = Uri.UnescapeDataString(parts[0]).ToLowerInvariant();
            var raw = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : string.Empty;

            switch (key)
            {
                case "sslmode":
                    builder.SslMode = raw.ToLowerInvariant() switch
                    {
                        "disable" => SslMode.Disable,
                        "allow" => SslMode.Allow,
                        "prefer" => SslMode.Prefer,
                        "verify-ca" => SslMode.VerifyCA,
                        "verify-full" => SslMode.VerifyFull,
                        _ => SslMode.Require,
                    };
                    break;
                case "channel_binding":
                    builder.ChannelBinding = raw.Equals("require", StringComparison.OrdinalIgnoreCase)
                        ? ChannelBinding.Require
                        : ChannelBinding.Prefer;
                    break;
                // Otros parámetros de libpq (options, application_name…) no hacen falta aquí.
            }
        }

        return builder.ConnectionString;
    }
}
