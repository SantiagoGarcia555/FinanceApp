using FinanceApp.Api.Hosting;
using Npgsql;

namespace FinanceApp.Api.Tests.Hosting;

public class DeploymentSettingsTests
{
    // ---------- Clave JWT ----------

    [Fact]
    public void JwtSecret_EnProduccion_RechazaElValorDeRelleno()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            DeploymentSettings.ValidateJwtSecret(DeploymentSettings.PlaceholderJwtSecret, isDevelopment: false));
        Assert.Contains("relleno", ex.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void JwtSecret_Vacia_FallaEnCualquierEntorno(string? secret)
    {
        Assert.Throws<InvalidOperationException>(() => DeploymentSettings.ValidateJwtSecret(secret, isDevelopment: true));
        Assert.Throws<InvalidOperationException>(() => DeploymentSettings.ValidateJwtSecret(secret, isDevelopment: false));
    }

    [Fact]
    public void JwtSecret_EnProduccion_RechazaClavesCortas() =>
        Assert.Throws<InvalidOperationException>(() => DeploymentSettings.ValidateJwtSecret(new string('x', 31), isDevelopment: false));

    [Fact]
    public void JwtSecret_ValidaOEnDesarrollo_SeDevuelveTalCual()
    {
        var strong = new string('k', 44);
        Assert.Equal(strong, DeploymentSettings.ValidateJwtSecret(strong, isDevelopment: false));
        Assert.Equal(DeploymentSettings.PlaceholderJwtSecret,
            DeploymentSettings.ValidateJwtSecret(DeploymentSettings.PlaceholderJwtSecret, isDevelopment: true));
    }

    [Fact]
    public void JwtSecret_ElRellenoEsElDeAppsettings()
    {
        // Si alguien cambia el relleno en appsettings.json, la guarda debe seguir reconociéndolo.
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        Assert.Contains(DeploymentSettings.PlaceholderJwtSecret, File.ReadAllText(path));
    }

    // ---------- Cadena de conexión ----------

    [Fact]
    public void ConnectionString_UriDeNeon_SeConvierteAFormatoNpgsql()
    {
        const string uri = "postgresql://app_owner:s3cr%40t@ep-cool-name-123456.us-east-1.aws.neon.tech/financeapp?sslmode=require&channel_binding=require";

        var cs = new NpgsqlConnectionStringBuilder(DeploymentSettings.NormalizeConnectionString(uri));

        Assert.Equal("ep-cool-name-123456.us-east-1.aws.neon.tech", cs.Host);
        Assert.Equal(5432, cs.Port);
        Assert.Equal("financeapp", cs.Database);
        Assert.Equal("app_owner", cs.Username);
        Assert.Equal("s3cr@t", cs.Password); // %40 decodificado
        Assert.Equal(SslMode.Require, cs.SslMode);
        Assert.Equal(ChannelBinding.Require, cs.ChannelBinding);
    }

    [Fact]
    public void ConnectionString_UriPostgresConPuerto()
    {
        var cs = new NpgsqlConnectionStringBuilder(DeploymentSettings.NormalizeConnectionString("postgres://u:p@db.example.com:6543/app"));
        Assert.Equal(6543, cs.Port);
        Assert.Equal("app", cs.Database);
    }

    [Fact]
    public void ConnectionString_FormatoNpgsql_NoSeToca()
    {
        const string classic = "Host=localhost;Port=5432;Database=finance_app;Username=postgres;Password=postgres";
        Assert.Equal(classic, DeploymentSettings.NormalizeConnectionString(classic));
    }
}
