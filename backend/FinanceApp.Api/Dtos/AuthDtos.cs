namespace FinanceApp.Api.Dtos;

public record RegisterRequest(string Email, string Password, string Name, string? PreferredCurrency);

public record LoginRequest(string Email, string Password);

public record RefreshRequest(string RefreshToken);

public record UserResponse(Guid Id, string Email, string Name, string PreferredCurrency);

public record AuthResponse(string AccessToken, string RefreshToken, DateTime AccessTokenExpiresAt, UserResponse User);
