using System.Text;
using FinanceApp.Api.Auth;
using FinanceApp.Api.Data;
using FinanceApp.Api.Hosting;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.HttpOverrides;
using FinanceApp.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Servicios ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Acepta "Host=…" o la URI que entrega Neon ("postgresql://…?sslmode=require").
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:DefaultConnection (variable ConnectionStrings__DefaultConnection).");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(DeploymentSettings.NormalizeConnectionString(connectionString)));

// --- Autenticación JWT ---
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<LoginLockoutOptions>(builder.Configuration.GetSection(LoginLockoutOptions.SectionName));
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// --- Importador de extractos CSV/Excel ---
builder.Services.AddScoped<ITransactionFileParser, CsvTransactionFileParser>();
builder.Services.AddScoped<ITransactionFileParser, ExcelTransactionFileParser>();

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
// Fuera de Development no arranca con la clave de relleno de appsettings.json ni con una clave corta.
var jwtSecret = DeploymentSettings.ValidateJwtSecret(jwtSection["SecretKey"], builder.Environment.IsDevelopment());

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Sin remapeo de claims: "sub" llega tal cual, no como ClaimTypes.NameIdentifier.
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.FromSeconds(30),
    };
});

builder.Services.AddAuthorization();

// En producción la web se sirve desde este mismo origen (no necesita CORS) y la app móvil nativa no aplica
// CORS. Los orígenes se pueden ampliar con Cors__AllowedOrigins__0=… si algún día la web vive en otro host.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:8081"]; // vite dev, expo dev
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod());
});

// Render (y casi cualquier PaaS) termina TLS en su proxy y reenvía por HTTP con X-Forwarded-*.
// Sin esto la app cree que la petición es http: UseHttpsRedirection redirigiría en bucle y los esquemas
// de URLs generadas saldrían mal. La IP del proxy no es fija, así que se confía en cualquier red.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// TODO: registrar aquí los servicios de dominio a medida que se implementen:
// - ITransactionService / TransactionService
// - ISavingsInsightService / MLNetSavingsInsightService (ver /Services)
// - IBankProviderAdapter (capa de integración Open Banking, fase futura)

var app = builder.Build();

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Despliegue de una sola instancia: aplicar migraciones pendientes al arrancar (Database__MigrateOnStartup=true).
// Con varias instancias habría que moverlo a un paso de release para evitar carreras.
if (app.Configuration.GetValue("Database:MigrateOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsProduction())
{
    // Render redirige http→https en su borde y el contenedor solo escucha HTTP: UseHttpsRedirection no tiene
    // puerto al que redirigir. HSTS sí aplica (la petición llega como https gracias a UseForwardedHeaders).
    app.UseHsts();
}
else
{
    app.UseHttpsRedirection();
}

// Web (React) servida desde wwwroot en el mismo origen que la API: la cookie de refresh (SameSite=Strict)
// funciona sin dominio propio y sin CORS. En desarrollo wwwroot no existe y la web corre en Vite.
var hasSpa = app.Environment.WebRootFileProvider.GetFileInfo("index.html").Exists;
if (hasSpa)
{
    app.UseStaticFiles(new StaticFileOptions
    {
        // Los assets de Vite llevan hash en el nombre: cache largo. index.html siempre se revalida.
        OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl =
            ctx.Context.Request.Path.StartsWithSegments("/assets") ? "public, max-age=31536000, immutable" : "no-cache",
    });
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check para el PaaS. NO toca la base: Render lo llama cada pocos segundos y despertaría a Neon
// (free tier = 100 CU-h/mes; tenerlo despierto 24/7 las agota).
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

if (hasSpa)
{
    // Rutas de API inexistentes → 404 JSON, no el index.html del SPA. El resto → SPA (React Router).
    app.Map("/api/{**rest}", () => Results.NotFound());
    app.MapFallbackToFile("index.html", new StaticFileOptions
    {
        OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "no-cache",
    });
}

app.Run();
