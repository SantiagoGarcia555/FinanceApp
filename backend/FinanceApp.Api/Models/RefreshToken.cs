namespace FinanceApp.Api.Models;

/// <summary>
/// Refresh token persistido en base de datos para poder revocarlo (logout, rotación,
/// compromiso de credenciales) sin depender únicamente de su expiración.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    /// <summary>Id del refresh token que lo reemplazó al rotar (auditoría). No es una FK forzada en BD.</summary>
    public Guid? ReplacedByTokenId { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
