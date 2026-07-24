using FinanceApp.Api.Auth;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using FinanceApp.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FinanceApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    ITokenService tokenService,
    IOptions<JwtOptions> jwtOptions,
    IPasswordHasher<User> passwordHasher) : ControllerBase
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email y contraseña son obligatorios.");

        if (request.Password.Length < 8)
            return BadRequest("La contraseña debe tener al menos 8 caracteres.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Email == normalizedEmail))
            return Conflict("Ya existe una cuenta con ese email.");

        var user = new User
        {
            Email = normalizedEmail,
            Name = request.Name,
            PreferredCurrency = string.IsNullOrWhiteSpace(request.PreferredCurrency) ? "COP" : request.PreferredCurrency,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return await IssueTokensAsync(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null)
            return Unauthorized("Email o contraseña incorrectos.");

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Email o contraseña incorrectos.");

        return await IssueTokensAsync(user);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var existing = await db.RefreshTokens
            .Include(rt => rt.User)
            .SingleOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (existing is null || !existing.IsActive || existing.User is null)
            return Unauthorized("Refresh token inválido o expirado.");

        // Rotación: se revoca el token usado al emitir uno nuevo.
        existing.RevokedAt = DateTime.UtcNow;

        return await IssueTokensAsync(existing.User, existing);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request)
    {
        var existing = await db.RefreshTokens.SingleOrDefaultAsync(rt => rt.Token == request.RefreshToken);
        if (existing is not null && existing.IsActive)
        {
            existing.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, RefreshToken? replaced = null)
    {
        var (accessToken, expiresAt) = tokenService.GenerateAccessToken(user);
        var refreshTokenValue = tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
        };

        db.RefreshTokens.Add(refreshToken);

        if (replaced is not null)
            replaced.ReplacedByTokenId = refreshToken.Id;

        await db.SaveChangesAsync();

        return new AuthResponse(
            accessToken,
            refreshTokenValue,
            expiresAt,
            new UserResponse(user.Id, user.Email, user.Name, user.PreferredCurrency));
    }
}
