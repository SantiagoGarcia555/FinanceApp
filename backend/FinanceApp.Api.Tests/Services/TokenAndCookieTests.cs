using System.IdentityModel.Tokens.Jwt;
using FinanceApp.Api.Auth;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Http;

namespace FinanceApp.Api.Tests.Services;

public class TokenServiceTests
{
    [Fact]
    public void GenerateAccessToken_IncluyeSubEmailEmisorYExpiracion()
    {
        var user = new User { Email = "ana@test.com", Name = "Ana" };
        var (token, expiresAt) = TestSupport.TokenService().GenerateAccessToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal(user.Id.ToString(), jwt.Subject);
        Assert.Equal("ana@test.com", jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Equal(TestSupport.Jwt.Issuer, jwt.Issuer);
        Assert.Contains(TestSupport.Jwt.Audience, jwt.Audiences);
        Assert.InRange(expiresAt, DateTime.UtcNow.AddMinutes(14), DateTime.UtcNow.AddMinutes(16));
    }

    [Fact]
    public void GenerateRefreshToken_EsAleatorioYLargo()
    {
        var service = TestSupport.TokenService();
        var tokens = Enumerable.Range(0, 50).Select(_ => service.GenerateRefreshToken()).ToList();

        Assert.Equal(50, tokens.Distinct().Count());
        Assert.All(tokens, t => Assert.Equal(64, Convert.FromBase64String(t).Length));
    }
}

public class RefreshTokenCookieTests
{
    [Theory]
    [InlineData("cookie", true)]
    [InlineData("COOKIE", true)]
    [InlineData("body", false)]
    [InlineData(null, false)]
    public void IsRequested_SegunElHeader(string? header, bool expected)
    {
        var http = new DefaultHttpContext();
        if (header is not null) http.Request.Headers[RefreshTokenCookie.TransportHeader] = header;
        Assert.Equal(expected, RefreshTokenCookie.IsRequested(http.Request));
    }

    [Fact]
    public void Read_DevuelveElValorONullSiNoHay()
    {
        var http = new DefaultHttpContext();
        Assert.Null(RefreshTokenCookie.Read(http.Request));

        http.Request.Headers.Cookie = $"{RefreshTokenCookie.Name}=abc123; otra=1";
        Assert.Equal("abc123", RefreshTokenCookie.Read(http.Request));
    }

    [Fact]
    public void Write_PoneBanderasDeSeguridadYExpiracion()
    {
        var http = new DefaultHttpContext();
        RefreshTokenCookie.Write(http.Response, "tok", new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        var header = http.Response.Headers.SetCookie.ToString().ToLowerInvariant();
        Assert.Contains("fa_refresh=tok", header);
        Assert.Contains("httponly", header);
        Assert.Contains("secure", header);
        Assert.Contains("samesite=strict", header);
        Assert.Contains("path=/api/auth", header);
        Assert.Contains("expires=tue, 01 jan 2030", header);
    }
}
