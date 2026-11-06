using FinanceApp.Api.Controllers;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace FinanceApp.Api.Tests.Controllers;

public class CategoriesControllerTests
{
    private readonly AppDbContext _db = TestSupport.CreateDb();
    private readonly User _user;

    public CategoriesControllerTests() => (_user, _) = TestSupport.AddUser(_db);

    private CategoriesController Controller(Guid? userId = null) => new CategoriesController(_db).AuthenticatedAs(userId ?? _user.Id);

    private async Task<List<CategoryResponse>> List(bool includeHidden = false, Guid? userId = null) =>
        (await Controller(userId).GetAll(includeHidden)).Value!.ToList();

    [Fact]
    public async Task GetAll_IncluyeLas13DelSistema()
    {
        var all = await List();
        Assert.Equal(13, all.Count(c => c.IsSystemDefined)); // US-08: sembradas, sin configurar nada
    }

    [Fact]
    public async Task Create_PropiaEsPrivadaDelUsuario()
    {
        var created = Assert.IsType<CreatedAtActionResult>((await Controller().Create(new CategoryRequest("Gimnasio", "health"))).Result);
        var category = Assert.IsType<CategoryResponse>(created.Value);
        Assert.False(category.IsSystemDefined);
        Assert.Equal("health", category.Icon);

        var (other, _) = TestSupport.AddUser(_db, "otro@test.com");
        Assert.DoesNotContain(await List(userId: other.Id), c => c.Name == "Gimnasio"); // US-09: privada
    }

    [Theory]
    [InlineData("Gimnasio")]
    [InlineData("  gimnasio  ")]
    [InlineData("alimentación")] // choca con una del sistema
    public async Task Create_RechazaNombresRepetidosSinImportarMayusculas(string name)
    {
        await Controller().Create(new CategoryRequest("Gimnasio", null));
        Assert.IsType<ConflictObjectResult>((await Controller().Create(new CategoryRequest(name, null))).Result);
    }

    [Fact]
    public async Task Create_NombreObligatorio()
    {
        Assert.IsType<BadRequestObjectResult>((await Controller().Create(new CategoryRequest("  ", null))).Result);
    }

    [Fact]
    public async Task Delete_DelSistemaSoloLaOcultaParaEseUsuario_YUnhideLaRestaura()
    {
        Assert.IsType<NoContentResult>(await Controller().Delete(SeedCategories.MascotasId));

        Assert.DoesNotContain(await List(), c => c.Id == SeedCategories.MascotasId);
        Assert.True((await List(includeHidden: true)).Single(c => c.Id == SeedCategories.MascotasId).IsHidden);
        Assert.Contains(_db.Categories, c => c.Id == SeedCategories.MascotasId); // no se borra

        var (other, _) = TestSupport.AddUser(_db, "otro@test.com");
        Assert.Contains(await List(userId: other.Id), c => c.Id == SeedCategories.MascotasId); // a otros no les afecta

        Assert.IsType<NoContentResult>(await Controller().Unhide(SeedCategories.MascotasId));
        Assert.Contains(await List(), c => c.Id == SeedCategories.MascotasId);
    }

    [Fact]
    public async Task Delete_PropiaLaElimina_YLaDeOtroUsuarioDevuelve404()
    {
        var mine = (Assert.IsType<CreatedAtActionResult>((await Controller().Create(new CategoryRequest("Moto", null))).Result).Value as CategoryResponse)!;
        Assert.IsType<NoContentResult>(await Controller().Delete(mine.Id));
        Assert.DoesNotContain(_db.Categories, c => c.Id == mine.Id);

        var (other, _) = TestSupport.AddUser(_db, "otro@test.com");
        var theirs = (Assert.IsType<CreatedAtActionResult>((await Controller(other.Id).Create(new CategoryRequest("Bebé", null))).Result).Value as CategoryResponse)!;
        Assert.IsType<NotFoundResult>(await Controller().Delete(theirs.Id));
    }

    [Fact]
    public async Task Update_NoPermiteEditarCategoriasDelSistema()
    {
        var result = await Controller().Update(SeedCategories.AlimentacionId, new CategoryRequest("Comida", null));
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Update_EditaNombreEIconoDeUnaPropia()
    {
        var mine = (Assert.IsType<CreatedAtActionResult>((await Controller().Create(new CategoryRequest("Moto", "transport"))).Result).Value as CategoryResponse)!;

        var updated = (await Controller().Update(mine.Id, new CategoryRequest(" Moto y gasolina ", "other"))).Value!;

        Assert.Equal("Moto y gasolina", updated.Name);
        Assert.Equal("other", updated.Icon);
        Assert.IsType<BadRequestObjectResult>((await Controller().Update(mine.Id, new CategoryRequest("", null))).Result);
    }

    [Fact]
    public async Task GetById_DelSistemaPropiaYAjena()
    {
        Assert.Equal("Alimentación", (await Controller().GetById(SeedCategories.AlimentacionId)).Value!.Name);

        await Controller().Delete(SeedCategories.MascotasId);
        Assert.True((await Controller().GetById(SeedCategories.MascotasId)).Value!.IsHidden);

        var (other, _) = TestSupport.AddUser(_db, "otro@test.com");
        var theirs = (Assert.IsType<CreatedAtActionResult>((await Controller(other.Id).Create(new CategoryRequest("Bebé", null))).Result).Value as CategoryResponse)!;
        Assert.IsType<NotFoundResult>((await Controller().GetById(theirs.Id)).Result);
    }

    [Fact]
    public async Task Unhide_SiNoEstabaOcultaDevuelve404()
    {
        Assert.IsType<NotFoundResult>(await Controller().Unhide(SeedCategories.AlimentacionId));
    }
}

public class DashboardControllerTests
{
    private readonly AppDbContext _db = TestSupport.CreateDb();
    private readonly User _user;
    private readonly Account _account;

    public DashboardControllerTests() => (_user, _account) = TestSupport.AddUser(_db);

    private DashboardController Controller() => new DashboardController(_db).AuthenticatedAs(_user.Id);

    [Fact]
    public async Task Summary_TotalesYGastoPorCategoriaDelMes()
    {
        TestSupport.AddTransaction(_db, _user, _account, 5_000_000, new DateTime(2026, 11, 1), "Nómina", SeedCategories.IngresosId);
        TestSupport.AddTransaction(_db, _user, _account, -100_000, new DateTime(2026, 11, 2), "Mercado", SeedCategories.AlimentacionId);
        TestSupport.AddTransaction(_db, _user, _account, -50_000, new DateTime(2026, 11, 3), "Restaurante", SeedCategories.AlimentacionId);
        TestSupport.AddTransaction(_db, _user, _account, -30_000, new DateTime(2026, 11, 3), "Sin categoría");
        TestSupport.AddTransaction(_db, _user, _account, -999_999, new DateTime(2026, 10, 31), "Octubre", SeedCategories.AlimentacionId);

        var summary = (await Controller().GetSummary("2026-11")).Value!;

        Assert.Equal("2026-11", summary.Month);
        Assert.Equal(5_000_000, summary.TotalIncome);
        Assert.Equal(-180_000, summary.TotalExpense); // conserva el signo
        Assert.Equal(4_820_000, summary.Balance);
        Assert.Equal("Alimentación", summary.ExpensesByCategory[0].CategoryName); // ordenado de mayor a menor
        Assert.Equal(150_000, summary.ExpensesByCategory[0].Total); // en positivo
        Assert.Contains(summary.ExpensesByCategory, c => c.CategoryName == "Sin categoría" && c.CategoryId == null);
    }

    [Fact]
    public async Task Summary_NoIncluyeDatosDeOtrosUsuarios()
    {
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        TestSupport.AddTransaction(_db, other, otherAccount, -500, new DateTime(2026, 11, 2), "Ajeno");

        var summary = (await Controller().GetSummary("2026-11")).Value!;
        Assert.Equal(0, summary.TotalExpense);
        Assert.Empty(summary.ExpensesByCategory);
    }

    [Theory]
    [InlineData("2026/11")]
    [InlineData("noviembre")]
    [InlineData("2026-13")]
    public async Task Summary_MesInvalido(string month)
    {
        Assert.IsType<BadRequestObjectResult>((await Controller().GetSummary(month)).Result);
    }

    [Fact]
    public async Task Trend_DevuelveNMesesTerminandoEnElActual()
    {
        TestSupport.AddTransaction(_db, _user, _account, -70_000, TestSupport.ThisMonth(1), "Este mes");

        var trend = (await Controller().GetTrend(6)).Value!;

        Assert.Equal(6, trend.Months.Count);
        Assert.Equal(TestSupport.ThisMonth().ToString("yyyy-MM"), trend.Months[^1].Month);
        Assert.Equal(-70_000, trend.Months[^1].TotalExpense);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(100, 24)]
    public async Task Trend_LimitaLaCantidadDeMeses(int requested, int expected)
    {
        Assert.Equal(expected, (await Controller().GetTrend(requested)).Value!.Months.Count);
    }
}
