using FinanceApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<CategorizationRule> CategorizationRules => Set<CategorizationRule>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<HiddenCategory> HiddenCategories => Set<HiddenCategory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // --- Usuario ---
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // --- Cuenta ---
        modelBuilder.Entity<Account>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // --- Categoria (UserId nulo = categoría del sistema) ---
        modelBuilder.Entity<Category>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // --- Transaccion ---
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Account)
            .WithMany()
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Category)
            .WithMany()
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Transaction>()
            .Property(t => t.Amount)
            .HasPrecision(18, 2);

        // "date" puro (sin hora/zona horaria): evita el choque de Npgsql 8 que exige
        // DateTime Kind=Utc para timestamptz cuando el cliente manda solo una fecha.
        modelBuilder.Entity<Transaction>()
            .Property(t => t.Date)
            .HasColumnType("date");

        // --- Presupuesto ---
        modelBuilder.Entity<Budget>()
            .HasOne(b => b.User)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Budget>()
            .HasOne(b => b.Category)
            .WithMany()
            .HasForeignKey(b => b.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Budget>()
            .Property(b => b.LimitAmount)
            .HasPrecision(18, 2);

        // --- Regla de categorizacion ---
        modelBuilder.Entity<CategorizationRule>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CategorizationRule>()
            .HasOne(r => r.Category)
            .WithMany()
            .HasForeignKey(r => r.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // --- Refresh token ---
        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany()
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token)
            .IsUnique();

        // --- Categoría oculta (categorías del sistema no se eliminan, se ocultan por usuario) ---
        modelBuilder.Entity<HiddenCategory>()
            .HasOne(h => h.User)
            .WithMany()
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HiddenCategory>()
            .HasOne(h => h.Category)
            .WithMany()
            .HasForeignKey(h => h.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HiddenCategory>()
            .HasIndex(h => new { h.UserId, h.CategoryId })
            .IsUnique();

        // --- Datos semilla: categorías predefinidas del sistema (US-08) ---
        modelBuilder.Entity<Category>().HasData(SeedCategories.All);
    }
}
