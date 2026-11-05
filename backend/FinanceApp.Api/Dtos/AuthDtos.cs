namespace FinanceApp.Api.Dtos;

public record RegisterRequest(string Email, string Password, string Name, string? PreferredCurrency);

public record LoginRequest(string Email, string Password);

/// <summary>RefreshToken es opcional: los clientes web lo envían en la cookie HttpOnly (ver RefreshTokenCookie).</summary>
public record RefreshRequest(string? RefreshToken);

public record UserResponse(Guid Id, string Email, string Name, string PreferredCurrency);

/// <summary>RefreshToken es null cuando el cliente pidió transporte por cookie (header X-Auth-Transport: cookie).</summary>
public record AuthResponse(string AccessToken, string? RefreshToken, DateTime AccessTokenExpiresAt, UserResponse User);
