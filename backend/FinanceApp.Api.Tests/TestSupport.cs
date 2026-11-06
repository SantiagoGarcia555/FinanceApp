using System.Security.Claims;
using System.Text;
using FinanceApp.Api.Auth;
using FinanceApp.Api.Data;
using FinanceApp.Api.Models;
using FinanceApp.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FinanceApp.Api.Tests;

/// <summary>Utilidades compartidas: base en memoria aislada por test, usuarios y contexto HTTP autenticado.</summary>
public static class TestSupport
{
    public static readonly JwtOptions Jwt = new()
    {
        Issuer = "FinanceApp.Tests",
        Audience = "FinanceApp.Tests.Clients",
        SecretKey = "clave-de-pruebas-de-al-menos-32-caracteres!!",
        AccessTokenMinutes = 15,
        RefreshTokenDays = 30,
    };

    /// <summary>Base nueva por llamada (nombre único) con las categorías del sistema sembradas.</summary>
    public static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        db.Database.EnsureCreated(); // aplica HasData (categorías del sistema)
        return db;
    }

    public static (User User, Account Account) AddUser(AppDbContext db, string email = "ana@test.com", string password = "password123")
    {
        var user = new User { Email = email, Name = "Ana Prueba" };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
        var account = new Account { UserId = user.Id, Name = "Efectivo", Type = AccountType.Cash };
        db.Users.Add(user);
        db.Accounts.Add(account);
        db.SaveChanges();
        return (user, account);
    }

    public static Transaction AddTransaction(
        AppDbContext db, User user, Account account, decimal amount, DateTime date,
        string description = "Movimiento", Guid? categoryId = null)
    {
        var t = new Transaction
        {
            UserId = user.Id,
            AccountId = account.Id,
            Amount = amount,
            Date = date,
            Description = description,
            CategoryId = categoryId,
        };
        db.Transactions.Add(t);
        db.SaveChanges();
        return t;
    }

    /// <summary>Simula un usuario autenticado: el JWT llega con el claim "sub" (MapInboundClaims = false).</summary>
    public static T AuthenticatedAs<T>(this T controller, Guid userId) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", userId.ToString())], "test")),
            },
        };
        return controller;
    }

    public static T WithHttpContext<T>(this T controller, HttpContext? context = null) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext { HttpContext = context ?? new DefaultHttpContext() };
        return controller;
    }

    public static IOptions<T> Options<T>(T value) where T : class => Microsoft.Extensions.Options.Options.Create(value);

    public static ITokenService TokenService() => new TokenService(Options(Jwt));

    public static IFormFile FormFile(string fileName, byte[] content) =>
        new FormFile(new MemoryStream(content), 0, content.Length, "file", fileName);

    public static IFormFile CsvFile(string content, string fileName = "extracto.csv") =>
        FormFile(fileName, Encoding.UTF8.GetBytes(content));

    /// <summary>Primer día del mes actual (UTC), igual que usan los controladores para "este mes".</summary>
    public static DateTime ThisMonth(int day = 1)
    {
        var now = DateTime.UtcNow;
        return new DateTime(now.Year, now.Month, day);
    }
}
