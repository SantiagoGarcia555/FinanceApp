using FinanceApp.Api.Controllers;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace FinanceApp.Api.Tests.Controllers;

public class BudgetsControllerTests
{
    private readonly AppDbContext _db = TestSupport.CreateDb();
    private readonly User _user;
    private readonly Account _account;

    public BudgetsControllerTests() => (_user, _account) = TestSupport.AddUser(_db);

    private BudgetsController Controller(Guid? userId = null) => new BudgetsController(_db).AuthenticatedAs(userId ?? _user.Id);

    private static BudgetResponse Created(ActionResult<BudgetResponse> result)
    {
        var obj = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, obj.StatusCode);
        return Assert.IsType<BudgetResponse>(obj.Value);
    }

    [Fact]
    public async Task Create_CalculaGastoDelMesActual()
    {
        TestSupport.AddTransaction(_db, _user, _account, -150_000, TestSupport.ThisMonth(2), "Mercado", SeedCategories.AlimentacionId);

        var budget = Created(await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 600_000, null)));

        Assert.Equal("monthly", budget.Period);
        Assert.Equal("Alimentación", budget.CategoryName);
        Assert.Equal(150_000, budget.Spent);
        Assert.Equal(450_000, budget.Remaining);
        Assert.Equal(25, budget.PercentUsed);
    }

    [Fact]
    public async Task Create_RechazaDuplicadoPorCategoriaYPeriodo()
    {
        await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 600_000, "monthly"));
        var dup = await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 1, "monthly"));
        Assert.IsType<ConflictObjectResult>(dup.Result);

        // Otro periodo para la misma categoría sí se permite
        Created(await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 7_000_000, "yearly")));
    }

    [Theory]
    [InlineData(0, null)]
    [InlineData(-5, null)]
    [InlineData(1000, "weekly")]
    public async Task Create_ValidaLimiteYPeriodo(decimal limit, string? period)
    {
        var result = await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, limit, period));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_NoPermiteCategoriaPropiaDeOtroUsuario()
    {
        var (other, _) = TestSupport.AddUser(_db, "otro@test.com");
        var foreign = new Category { UserId = other.Id, Name = "Privada", IsSystemDefined = false };
        _db.Categories.Add(foreign);
        await _db.SaveChangesAsync();

        var result = await Controller().Create(new BudgetRequest(foreign.Id, 1000, null));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetAll_MensualCuentaSoloElMesYAnualTodoElAnio()
    {
        var month = TestSupport.ThisMonth();
        var otherMonthSameYear = month.Month == 1 ? month.AddMonths(1) : month.AddMonths(-1);

        TestSupport.AddTransaction(_db, _user, _account, -100_000, month.AddDays(1), "Este mes", SeedCategories.TransporteId);
        TestSupport.AddTransaction(_db, _user, _account, -40_000, otherMonthSameYear, "Otro mes", SeedCategories.TransporteId);
        TestSupport.AddTransaction(_db, _user, _account, 50_000, month.AddDays(2), "Reembolso (ingreso)", SeedCategories.TransporteId);
        TestSupport.AddTransaction(_db, _user, _account, -999_000, month.AddDays(1), "Otra categoría", SeedCategories.SaludId);

        await Controller().Create(new BudgetRequest(SeedCategories.TransporteId, 200_000, "monthly"));
        await Controller().Create(new BudgetRequest(SeedCategories.TransporteId, 1_000_000, "yearly"));

        var budgets = (await Controller().GetAll(null)).Value!;

        Assert.Equal(100_000, budgets.Single(b => b.Period == "monthly").Spent); // ignora otros meses e ingresos
        Assert.Equal(140_000, budgets.Single(b => b.Period == "yearly").Spent); // suma todo el año
    }

    [Fact]
    public async Task GetAll_OrdenaPorPorcentajeUsadoYReportaExceso()
    {
        TestSupport.AddTransaction(_db, _user, _account, -110_000, TestSupport.ThisMonth(1), "Mercado", SeedCategories.AlimentacionId);
        TestSupport.AddTransaction(_db, _user, _account, -10_000, TestSupport.ThisMonth(1), "Bus", SeedCategories.TransporteId);
        await Controller().Create(new BudgetRequest(SeedCategories.TransporteId, 100_000, null));
        await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 100_000, null));

        var budgets = (await Controller().GetAll(null)).Value!;

        Assert.Equal("Alimentación", budgets[0].CategoryName);
        Assert.Equal(110, budgets[0].PercentUsed);
        Assert.Equal(-10_000, budgets[0].Remaining);
    }

    [Fact]
    public async Task GetAll_IgnoraGastosDeOtrosUsuariosYNoMuestraSusPresupuestos()
    {
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        TestSupport.AddTransaction(_db, other, otherAccount, -500_000, TestSupport.ThisMonth(1), "Ajeno", SeedCategories.AlimentacionId);
        await Controller(other.Id).Create(new BudgetRequest(SeedCategories.AlimentacionId, 1_000, null));
        await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 600_000, null));

        var mine = Assert.Single((await Controller().GetAll(null)).Value!);
        Assert.Equal(0, mine.Spent);
    }

    [Fact]
    public async Task GetAll_MesInvalido()
    {
        Assert.IsType<BadRequestObjectResult>((await Controller().GetAll("2026/11")).Result);
    }

    [Fact]
    public async Task Update_CambiaLimiteYDetectaConflictoDePeriodo()
    {
        var monthly = Created(await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 100, "monthly")));
        Created(await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 1000, "yearly")));

        var updated = (await Controller().Update(monthly.Id, new BudgetUpdateRequest(250, null))).Value!;
        Assert.Equal(250, updated.LimitAmount);

        var conflict = await Controller().Update(monthly.Id, new BudgetUpdateRequest(250, "yearly"));
        Assert.IsType<ConflictObjectResult>(conflict.Result);
    }

    [Fact]
    public async Task UpdateYDelete_PresupuestoDeOtroUsuarioDevuelve404()
    {
        var (other, _) = TestSupport.AddUser(_db, "otro@test.com");
        var foreign = Created(await Controller(other.Id).Create(new BudgetRequest(SeedCategories.AlimentacionId, 100, null)));

        Assert.IsType<NotFoundResult>((await Controller().Update(foreign.Id, new BudgetUpdateRequest(1, null))).Result);
        Assert.IsType<NotFoundResult>(await Controller().Delete(foreign.Id));
        Assert.Single(_db.Budgets);
    }

    [Fact]
    public async Task Delete_EliminaElPresupuesto()
    {
        var budget = Created(await Controller().Create(new BudgetRequest(SeedCategories.AlimentacionId, 100, null)));
        Assert.IsType<NoContentResult>(await Controller().Delete(budget.Id));
        Assert.Empty(_db.Budgets);
    }
}
