using FinanceApp.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// --- Servicios ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", // web (vite dev)
                "http://localhost:8081"  // mobile (expo dev)
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// TODO: registrar aquí los servicios de dominio a medida que se implementen:
// - ITransactionService / TransactionService
// - ISavingsInsightService / MLNetSavingsInsightService (ver /Services)
// - IBankProviderAdapter (capa de integración Open Banking, fase futura)

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
