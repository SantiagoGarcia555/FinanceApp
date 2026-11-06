using FinanceApp.Api.Auth;
using FinanceApp.Api.Controllers;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Tests.Controllers;

public class AuthControllerTests
{
    private readonly AppDbContext _db = TestSupport.CreateDb();

    private AuthController Controller(HttpContext? http = null, int maxAttempts = 5, int lockoutMinutes = 15) =>
        new AuthController(
                _db,
                TestSupport.TokenService(),
                TestSupport.Options(TestSupport.Jwt),
                TestSupport.Options(new LoginLockoutOptions { MaxFailedAttempts = maxAttempts, LockoutMinutes = lockoutMinutes }),
                new PasswordHasher<User>())
            .WithHttpContext(http);

    private static HttpContext CookieClient(string? refreshCookie = null)
    {
        var http = new DefaultHttpContext();
        http.Request.Headers[RefreshTokenCookie.TransportHeader] = "cookie";
        if (refreshCookie is not null)
            http.Request.Headers.Cookie = $"{RefreshTokenCookie.Name}={Uri.EscapeDataString(refreshCookie)}";
        return http;
    }

    private static int? StatusOf<T>(ActionResult<T> result) => (result.Result as IStatusCodeActionResult)?.StatusCode;

    // ---------- Registro (US-01) ----------

    [Fact]
    public async Task Register_CreaUsuarioConCuentaPorDefectoYDevuelveTokens()
    {
        var result = await Controller().Register(new RegisterRequest(" Ana@Test.com ", "password123", "Ana", null));

        var auth = Assert.IsType<AuthResponse>(result.Value);
        Assert.False(string.IsNullOrEmpty(auth.AccessToken));
        Assert.False(string.IsNullOrEmpty(auth.RefreshToken));
        Assert.Equal("ana@test.com", auth.User.Email); // normalizado
        Assert.Equal("COP", auth.User.PreferredCurrency);

        var user = await _db.Users.SingleAsync();
        Assert.NotEqual("password123", user.PasswordHash); // nunca en texto plano
        Assert.Equal("Efectivo", (await _db.Accounts.SingleAsync(a => a.UserId == user.Id)).Name);
    }

    [Fact]
    public async Task Register_RechazaEmailDuplicado()
    {
        TestSupport.AddUser(_db, "ana@test.com");
        var result = await Controller().Register(new RegisterRequest("ANA@test.com", "password123", "Ana", null));
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Theory]
    [InlineData("", "password123")]
    [InlineData("ana@test.com", "")]
    [InlineData("ana@test.com", "corta")]
    public async Task Register_ValidaDatos(string email, string password)
    {
        var result = await Controller().Register(new RegisterRequest(email, password, "Ana", null));
        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(_db.Users);
    }

    // ---------- Login (US-02) ----------

    [Fact]
    public async Task Login_CredencialesCorrectas()
    {
        TestSupport.AddUser(_db, "ana@test.com", "password123");
        var result = await Controller().Login(new LoginRequest("ANA@test.com", "password123"));
        Assert.IsType<AuthResponse>(result.Value);
    }

    [Fact]
    public async Task Login_MismoMensajeParaEmailInexistenteYContrasenaMala()
    {
        TestSupport.AddUser(_db, "ana@test.com", "password123");

        var noUser = await Controller().Login(new LoginRequest("nadie@test.com", "password123"));
        var badPass = await Controller().Login(new LoginRequest("ana@test.com", "mala"));

        var a = Assert.IsType<UnauthorizedObjectResult>(noUser.Result);
        var b = Assert.IsType<UnauthorizedObjectResult>(badPass.Result);
        Assert.Equal(a.Value, b.Value); // no revela si el correo existe
    }

    [Fact]
    public async Task Login_BloqueaTrasCincoIntentosFallidosConsecutivos()
    {
        var (user, _) = TestSupport.AddUser(_db, "ana@test.com", "password123");

        for (var i = 1; i <= 4; i++)
            Assert.Equal(401, StatusOf(await Controller().Login(new LoginRequest("ana@test.com", "mala"))));

        var http = new DefaultHttpContext();
        var fifth = await Controller(http).Login(new LoginRequest("ana@test.com", "mala"));

        Assert.Equal(429, StatusOf(fifth));
        Assert.Equal((15 * 60).ToString(), http.Response.Headers.RetryAfter.ToString());
        await _db.Entry(user).ReloadAsync();
        Assert.NotNull(user.LockoutEndAt);
        Assert.Equal(0, user.FailedLoginAttempts); // el contador se reinicia al bloquear
    }

    [Fact]
    public async Task Login_DuranteElBloqueoNiLaContrasenaCorrectaPasa()
    {
        var (user, _) = TestSupport.AddUser(_db, "ana@test.com", "password123");
        user.LockoutEndAt = DateTime.UtcNow.AddMinutes(10);
        await _db.SaveChangesAsync();

        var result = await Controller().Login(new LoginRequest("ana@test.com", "password123"));

        Assert.Equal(429, StatusOf(result));
        Assert.Contains("minutos", (result.Result as ObjectResult)?.Value as string);
    }

    [Fact]
    public async Task Login_TrasExpirarElBloqueoPermiteEntrarYReiniciaContador()
    {
        var (user, _) = TestSupport.AddUser(_db, "ana@test.com", "password123");
        user.LockoutEndAt = DateTime.UtcNow.AddMinutes(-1);
        user.FailedLoginAttempts = 3;
        await _db.SaveChangesAsync();

        var result = await Controller().Login(new LoginRequest("ana@test.com", "password123"));

        Assert.IsType<AuthResponse>(result.Value);
        await _db.Entry(user).ReloadAsync();
        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.Null(user.LockoutEndAt);
    }

    [Fact]
    public async Task Login_ExitoIntermedioReiniciaLosIntentos()
    {
        var (user, _) = TestSupport.AddUser(_db, "ana@test.com", "password123");

        for (var i = 0; i < 4; i++) await Controller().Login(new LoginRequest("ana@test.com", "mala"));
        await Controller().Login(new LoginRequest("ana@test.com", "password123"));
        var afterReset = await Controller().Login(new LoginRequest("ana@test.com", "mala"));

        Assert.Equal(401, StatusOf(afterReset)); // no bloquea: el éxito reinició el contador
        await _db.Entry(user).ReloadAsync();
        Assert.Equal(1, user.FailedLoginAttempts);
    }

    [Fact]
    public async Task Login_EmailInexistenteNoAcumulaIntentos()
    {
        for (var i = 0; i < 10; i++)
            Assert.Equal(401, StatusOf(await Controller().Login(new LoginRequest("nadie@test.com", "x"))));
    }

    // ---------- Refresh y logout (US-03) ----------

    [Fact]
    public async Task Refresh_RotaElTokenYElAnteriorNoSePuedeReusar()
    {
        TestSupport.AddUser(_db, "ana@test.com", "password123");
        var login = (await Controller().Login(new LoginRequest("ana@test.com", "password123"))).Value!;

        var refreshed = await Controller().Refresh(new RefreshRequest(login.RefreshToken));
        var reuse = await Controller().Refresh(new RefreshRequest(login.RefreshToken));

        var newAuth = Assert.IsType<AuthResponse>(refreshed.Value);
        Assert.NotEqual(login.RefreshToken, newAuth.RefreshToken);
        Assert.IsType<UnauthorizedObjectResult>(reuse.Result);

        var old = await _db.RefreshTokens.SingleAsync(t => t.Token == login.RefreshToken);
        Assert.NotNull(old.RevokedAt);
        Assert.NotNull(old.ReplacedByTokenId);
    }

    [Fact]
    public async Task Refresh_TokenDesconocidoOVencido()
    {
        var (user, _) = TestSupport.AddUser(_db);
        _db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, Token = "vencido", ExpiresAt = DateTime.UtcNow.AddMinutes(-1) });
        await _db.SaveChangesAsync();

        Assert.IsType<UnauthorizedObjectResult>((await Controller().Refresh(new RefreshRequest("no-existe"))).Result);
        Assert.IsType<UnauthorizedObjectResult>((await Controller().Refresh(new RefreshRequest("vencido"))).Result);
        Assert.IsType<UnauthorizedObjectResult>((await Controller().Refresh(new RefreshRequest(null))).Result);
    }

    [Fact]
    public async Task Logout_RevocaElRefreshToken()
    {
        TestSupport.AddUser(_db, "ana@test.com", "password123");
        var login = (await Controller().Login(new LoginRequest("ana@test.com", "password123"))).Value!;

        Assert.IsType<NoContentResult>(await Controller().Logout(new RefreshRequest(login.RefreshToken)));
        Assert.IsType<UnauthorizedObjectResult>((await Controller().Refresh(new RefreshRequest(login.RefreshToken))).Result);
    }

    // ---------- Transporte por cookie HttpOnly (web) ----------

    [Fact]
    public async Task Login_ConHeaderCookieEntregaCookieHttpOnlyYOmiteElTokenDelBody()
    {
        TestSupport.AddUser(_db, "ana@test.com", "password123");
        var http = CookieClient();

        var auth = (await Controller(http).Login(new LoginRequest("ana@test.com", "password123"))).Value!;

        Assert.Null(auth.RefreshToken);
        var setCookie = http.Response.Headers.SetCookie.ToString().ToLowerInvariant();
        Assert.Contains($"{RefreshTokenCookie.Name}=", setCookie);
        Assert.Contains("httponly", setCookie);
        Assert.Contains("secure", setCookie);
        Assert.Contains("samesite=strict", setCookie);
        Assert.Contains("path=/api/auth", setCookie);
    }

    [Fact]
    public async Task Refresh_LeeElTokenDeLaCookie()
    {
        TestSupport.AddUser(_db, "ana@test.com", "password123");
        var mobile = (await Controller().Login(new LoginRequest("ana@test.com", "password123"))).Value!;

        var http = CookieClient(mobile.RefreshToken);
        var refreshed = await Controller(http).Refresh(new RefreshRequest(null));

        Assert.IsType<AuthResponse>(refreshed.Value);
        Assert.Contains(RefreshTokenCookie.Name, http.Response.Headers.SetCookie.ToString());
    }

    [Fact]
    public async Task Logout_BorraLaCookieAunqueNoHayaToken()
    {
        var http = CookieClient();
        Assert.IsType<NoContentResult>(await Controller(http).Logout(new RefreshRequest(null)));
        Assert.Contains($"{RefreshTokenCookie.Name}=;", http.Response.Headers.SetCookie.ToString());
    }
}
