using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FinanceApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedSystemCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Icon", "IsSystemDefined", "Name", "UserId" },
                values: new object[,]
                {
                    { new Guid("089a6b63-3b72-4831-9622-6d99599394e5"), "health", true, "Salud", null },
                    { new Guid("3ac79515-6c07-403c-8804-61728472f72f"), "savings", true, "Ahorro e inversión", null },
                    { new Guid("3c723a1e-8528-4653-ac34-d16881e55d1c"), "home", true, "Vivienda", null },
                    { new Guid("40643b72-5107-4e0d-8321-9318b6a6dae9"), "food", true, "Alimentación", null },
                    { new Guid("55943f03-6976-47ad-808b-f494ff5750e2"), "clothing", true, "Ropa", null },
                    { new Guid("666903fa-4cea-4cb2-a3ac-f6030cd18cf8"), "income", true, "Ingresos", null },
                    { new Guid("84240dc6-9c7d-429c-80cb-eb7abdcff105"), "utilities", true, "Servicios públicos", null },
                    { new Guid("8eac4693-af45-4894-adc8-ce742c0d08b4"), "debt", true, "Deudas y préstamos", null },
                    { new Guid("b100c846-cb78-44cf-8d5c-32494f3c3f49"), "pets", true, "Mascotas", null },
                    { new Guid("b372fb3c-4a28-4fbe-86e2-494191cb0ebc"), "education", true, "Educación", null },
                    { new Guid("c17353ed-5ecc-4cd3-82fb-78e51dbd9f57"), "other", true, "Otros", null },
                    { new Guid("e0a52530-1752-46a4-b1a2-5df68d3e3f1d"), "transport", true, "Transporte", null },
                    { new Guid("e746965f-73fc-4208-a642-c6bbdf7ece7e"), "entertainment", true, "Entretenimiento", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("089a6b63-3b72-4831-9622-6d99599394e5"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("3ac79515-6c07-403c-8804-61728472f72f"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("3c723a1e-8528-4653-ac34-d16881e55d1c"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("40643b72-5107-4e0d-8321-9318b6a6dae9"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("55943f03-6976-47ad-808b-f494ff5750e2"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("666903fa-4cea-4cb2-a3ac-f6030cd18cf8"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("84240dc6-9c7d-429c-80cb-eb7abdcff105"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("8eac4693-af45-4894-adc8-ce742c0d08b4"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b100c846-cb78-44cf-8d5c-32494f3c3f49"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("b372fb3c-4a28-4fbe-86e2-494191cb0ebc"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("c17353ed-5ecc-4cd3-82fb-78e51dbd9f57"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e0a52530-1752-46a4-b1a2-5df68d3e3f1d"));

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: new Guid("e746965f-73fc-4208-a642-c6bbdf7ece7e"));
        }
    }
}
