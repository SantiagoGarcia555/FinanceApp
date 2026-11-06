using FinanceApp.Api.Controllers;
using FinanceApp.Api.Data;
using FinanceApp.Api.Dtos;
using FinanceApp.Api.Models;
using FinanceApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanceApp.Api.Tests.Controllers;

public class TransactionsControllerTests
{
    private readonly AppDbContext _db = TestSupport.CreateDb();
    private readonly User _user;
    private readonly Account _account;

    public TransactionsControllerTests() => (_user, _account) = TestSupport.AddUser(_db);

    private TransactionsController Controller(Guid? userId = null) =>
        new TransactionsController(_db, [new CsvTransactionFileParser(), new ExcelTransactionFileParser()])
            .AuthenticatedAs(userId ?? _user.Id);

    private static TransactionRequest Request(decimal amount = -38_900, string description = "Rappi", Guid? categoryId = null, Guid? accountId = null) =>
        new(accountId, categoryId ?? SeedCategories.AlimentacionId, amount, null, description, new DateTime(2026, 11, 5));

    // ---------- Crear (US-04) ----------

    [Fact]
    public async Task Create_UsaCuentaPorDefectoYMonedaCOP()
    {
        var result = await Controller().Create(Request());

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var tx = Assert.IsType<TransactionResponse>(created.Value);
        Assert.Equal(_account.Id, tx.AccountId);
        Assert.Equal("COP", tx.Currency);
        Assert.Equal("Alimentación", tx.CategoryName);
        Assert.Equal("Manual", tx.Source);
    }

    [Theory]
    [InlineData(0, "Rappi")]
    [InlineData(-100, "")]
    [InlineData(-100, "   ")]
    public async Task Create_ValidaMontoYDescripcion(decimal amount, string description)
    {
        var result = await Controller().Create(Request(amount, description));
        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(_db.Transactions);
    }

    [Fact]
    public async Task Create_RechazaCuentaOCategoriaDeOtroUsuario()
    {
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        var foreignCategory = new Category { UserId = other.Id, Name = "Privada", IsSystemDefined = false };
        _db.Categories.Add(foreignCategory);
        await _db.SaveChangesAsync();

        Assert.IsType<BadRequestObjectResult>((await Controller().Create(Request(accountId: otherAccount.Id))).Result);
        Assert.IsType<BadRequestObjectResult>((await Controller().Create(Request(categoryId: foreignCategory.Id))).Result);
    }

    // ---------- Listar y filtrar (US-07) ----------

    [Fact]
    public async Task GetAll_FiltraPorTipoFechasYCategoria_YSoloDelUsuario()
    {
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        TestSupport.AddTransaction(_db, other, otherAccount, -1, new DateTime(2026, 11, 5), "Ajeno");
        TestSupport.AddTransaction(_db, _user, _account, -50_000, new DateTime(2026, 11, 3), "Mercado", SeedCategories.AlimentacionId);
        TestSupport.AddTransaction(_db, _user, _account, -20_000, new DateTime(2026, 11, 4), "Bus", SeedCategories.TransporteId);
        TestSupport.AddTransaction(_db, _user, _account, 5_000_000, new DateTime(2026, 11, 1), "Nómina", SeedCategories.IngresosId);
        TestSupport.AddTransaction(_db, _user, _account, -10_000, new DateTime(2026, 10, 20), "Octubre", SeedCategories.AlimentacionId);

        var all = (await Controller().GetAll(null, null, null, null, null, null, null)).Value!;
        Assert.Equal(4, all.TotalCount); // no incluye el del otro usuario
        Assert.Equal("Bus", all.Items[0].Description); // ordenado por fecha descendente

        var expenses = (await Controller().GetAll(null, null, null, null, null, null, "expense")).Value!;
        Assert.All(expenses.Items, t => Assert.True(t.Amount < 0));

        var income = (await Controller().GetAll(null, null, null, null, null, null, "income")).Value!;
        Assert.Equal("Nómina", Assert.Single(income.Items).Description);

        var november = (await Controller().GetAll(new DateTime(2026, 11, 1), new DateTime(2026, 11, 30), null, null, null, null, null)).Value!;
        Assert.Equal(3, november.TotalCount);

        var food = (await Controller().GetAll(null, null, SeedCategories.AlimentacionId, null, null, null, null)).Value!;
        Assert.Equal(2, food.TotalCount);
    }

    [Fact]
    public async Task GetAll_PaginaYLimitaElTamanio()
    {
        for (var i = 1; i <= 25; i++)
            TestSupport.AddTransaction(_db, _user, _account, -i, new DateTime(2026, 11, 1).AddDays(i % 28), $"Mov {i}");

        var page2 = (await Controller().GetAll(null, null, null, null, null, null, null, page: 2, pageSize: 10)).Value!;
        Assert.Equal(25, page2.TotalCount);
        Assert.Equal(3, page2.TotalPages);
        Assert.Equal(10, page2.Items.Count);

        var huge = (await Controller().GetAll(null, null, null, null, null, null, null, page: 1, pageSize: 10_000)).Value!;
        Assert.Equal(100, huge.PageSize); // tope
    }

    // ---------- Editar y eliminar (US-05, US-06) ----------

    [Fact]
    public async Task UpdateYDelete_DeOtroUsuarioDevuelven404()
    {
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        var foreign = TestSupport.AddTransaction(_db, other, otherAccount, -1000, new DateTime(2026, 11, 5), "Ajeno");

        Assert.IsType<NotFoundResult>((await Controller().Update(foreign.Id, Request())).Result);
        Assert.IsType<NotFoundResult>(await Controller().Delete(foreign.Id));
        Assert.Equal(-1000, (await _db.Transactions.SingleAsync()).Amount);
    }

    [Fact]
    public async Task Update_ModificaCamposYConservaCuenta()
    {
        var tx = TestSupport.AddTransaction(_db, _user, _account, -1000, new DateTime(2026, 11, 5), "Antes");

        var updated = (await Controller().Update(tx.Id, Request(-2500, "Después", SeedCategories.SaludId))).Value!;

        Assert.Equal(-2500, updated.Amount);
        Assert.Equal("Después", updated.Description);
        Assert.Equal("Salud", updated.CategoryName);
        Assert.Equal(_account.Id, updated.AccountId);
    }

    [Fact]
    public async Task Delete_EliminaPermanentemente()
    {
        var tx = TestSupport.AddTransaction(_db, _user, _account, -1000, new DateTime(2026, 11, 5));
        Assert.IsType<NoContentResult>(await Controller().Delete(tx.Id));
        Assert.Empty(_db.Transactions);
    }

    // ---------- Importador (US-10, US-11) ----------

    private const string Csv =
        "Fecha;Descripción;Valor\n" +
        "05/11/2026;Rappi;-38.900\n" +
        "04/11/2026;Nómina;5.200.000\n" +
        "31/02/2026;Fecha mala;-1\n";

    [Fact]
    public void Inspect_DevuelveColumnasYMapeoSugerido()
    {
        var result = Controller().InspectImport(TestSupport.CsvFile(Csv));

        var inspect = Assert.IsType<ImportInspectResponse>(result.Value);
        Assert.Equal(["Fecha", "Descripción", "Valor"], inspect.Headers);
        Assert.Equal("Fecha", inspect.SuggestedDateColumn);
        Assert.Equal("Valor", inspect.SuggestedAmountColumn);
        Assert.Equal("Descripción", inspect.SuggestedDescriptionColumn);
        Assert.Equal(3, inspect.SampleRows.Count);
    }

    [Theory]
    [InlineData("extracto.pdf")]
    [InlineData("extracto.xls")]
    public void Inspect_RechazaFormatosNoSoportados(string fileName)
    {
        var result = Controller().InspectImport(TestSupport.FormFile(fileName, [1, 2, 3]));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Preview_MarcaDuplicadosIgnorandoMayusculasYEspacios_YNoGuardaNada()
    {
        TestSupport.AddTransaction(_db, _user, _account, -38_900, new DateTime(2026, 11, 5), "  RAPPI ");

        var preview = (await Controller().PreviewImport(TestSupport.CsvFile(Csv), "Fecha", "Valor", "Descripción")).Value!;

        Assert.Equal(3, preview.TotalRows);
        Assert.Equal(2, preview.ValidRows);
        Assert.Equal(1, preview.ErrorRows);
        Assert.Equal(1, preview.DuplicateRows);
        Assert.True(preview.Rows.Single(r => r.Description == "Rappi").IsDuplicate);
        Assert.Single(_db.Transactions); // la previsualización no inserta
    }

    [Fact]
    public async Task Preview_NoMarcaDuplicadosDeOtroUsuario()
    {
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        TestSupport.AddTransaction(_db, other, otherAccount, -38_900, new DateTime(2026, 11, 5), "Rappi");

        var preview = (await Controller().PreviewImport(TestSupport.CsvFile(Csv), "Fecha", "Valor", "Descripción")).Value!;
        Assert.Equal(0, preview.DuplicateRows);
    }

    [Fact]
    public async Task Preview_ColumnasInexistentesDevuelve400()
    {
        var result = await Controller().PreviewImport(TestSupport.CsvFile(Csv), "Fecha", "Monto", "Descripción");
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Confirm_InsertaComoImportacionCsvEnLaCuentaPorDefecto()
    {
        var rows = new List<ImportConfirmRow>
        {
            new(new DateTime(2026, 11, 5), -38_900, "Rappi", SeedCategories.AlimentacionId),
            new(new DateTime(2026, 11, 4), 5_200_000, "Nómina", null),
        };

        var result = (await Controller().ConfirmImport(new ImportConfirmRequest(null, rows))).Value!;

        Assert.Equal(2, result.ImportedCount);
        Assert.All(await _db.Transactions.ToListAsync(), t =>
        {
            Assert.Equal(TransactionSource.CsvImport, t.Source);
            Assert.Equal(_account.Id, t.AccountId);
            Assert.Equal(_user.Id, t.UserId);
        });
    }

    [Fact]
    public async Task GetById_PropiaYAjena()
    {
        var mine = TestSupport.AddTransaction(_db, _user, _account, -1000, new DateTime(2026, 11, 5), "Mía");
        var (other, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        var theirs = TestSupport.AddTransaction(_db, other, otherAccount, -1000, new DateTime(2026, 11, 5), "Ajena");

        Assert.Equal("Mía", (await Controller().GetById(mine.Id)).Value!.Description);
        Assert.IsType<NotFoundResult>((await Controller().GetById(theirs.Id)).Result);
    }

    [Fact]
    public async Task Update_ValidaMontoDescripcionYCategoria()
    {
        var tx = TestSupport.AddTransaction(_db, _user, _account, -1000, new DateTime(2026, 11, 5));
        Assert.IsType<BadRequestObjectResult>((await Controller().Update(tx.Id, Request(0))).Result);
        Assert.IsType<BadRequestObjectResult>((await Controller().Update(tx.Id, Request(description: " "))).Result);
        Assert.IsType<BadRequestObjectResult>((await Controller().Update(tx.Id, Request(categoryId: Guid.NewGuid()))).Result);
    }

    [Fact]
    public async Task ImportEndpoints_ArchivoVacioODatosFaltantes()
    {
        var empty = TestSupport.FormFile("vacio.csv", []);
        Assert.IsType<BadRequestObjectResult>(Controller().InspectImport(empty).Result);
        Assert.IsType<BadRequestObjectResult>((await Controller().PreviewImport(empty, "Fecha", "Valor", "Descripción")).Result);

        var onlyHeaderless = TestSupport.CsvFile("");
        Assert.IsType<BadRequestObjectResult>(Controller().InspectImport(onlyHeaderless).Result);

        Assert.IsType<BadRequestObjectResult>((await Controller().PreviewImport(TestSupport.CsvFile(Csv), "", "Valor", "Descripción")).Result);
        Assert.IsType<BadRequestObjectResult>((await Controller().PreviewImport(TestSupport.FormFile("x.pdf", [1]), "Fecha", "Valor", "Descripción")).Result);
    }

    [Fact]
    public async Task Confirm_ConCuentaAjenaDevuelve400()
    {
        var (_, otherAccount) = TestSupport.AddUser(_db, "otro@test.com");
        var rows = new List<ImportConfirmRow> { new(new DateTime(2026, 11, 5), -1, "X", null) };
        Assert.IsType<BadRequestObjectResult>((await Controller().ConfirmImport(new ImportConfirmRequest(otherAccount.Id, rows))).Result);
    }

    [Fact]
    public async Task Confirm_ValidaFilasYCategorias()
    {
        Assert.IsType<BadRequestObjectResult>((await Controller().ConfirmImport(new ImportConfirmRequest(null, []))).Result);

        var bad = new List<ImportConfirmRow> { new(new DateTime(2026, 11, 5), -1, "X", Guid.NewGuid()) };
        Assert.IsType<BadRequestObjectResult>((await Controller().ConfirmImport(new ImportConfirmRequest(null, bad))).Result);
        Assert.Empty(_db.Transactions);
    }
}
