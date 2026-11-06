using ClosedXML.Excel;

namespace FinanceApp.Api.Tests.Services;

/// <summary>
/// Libros sintéticos que reproducen la ESTRUCTURA de los extractos reales de Bancolombia en Excel
/// (datos inventados; los extractos reales tienen datos personales y no se versionan).
/// </summary>
internal static class StatementFixtures
{
    /// <summary>
    /// Cuenta de ahorros: bloque del cliente + periodo DESDE/HASTA (etiquetas arriba, valores abajo), resumen,
    /// encabezado en la fila 12, fechas "d/MM" sin año, montos texto formato US, el bloque del cliente y el
    /// encabezado repetidos en el salto de página, y "FIN ESTADO DE CUENTA" al final.
    /// </summary>
    public static MemoryStream SavingsAccount(string desde = "2026/06/30", string hasta = "2026/09/30", params (string Date, string Description, string Amount)[] movements)
    {
        if (movements.Length == 0)
        {
            movements =
            [
                ("1/07", "TRANSFERENCIAS A NEQUI", "-30,000.00"),
                ("2/07", "ABONO INTERESES AHORROS", ".37"),
                ("15/07", "PAGO DE NOMINA EMPRESA", "1,443,063.00"),
                // --- salto de página después de esta fila ---
                ("1/09", "TRANSFERENCIA CTA SUC VIRTUAL", "-70,000.00"),
                ("1/09", "TRANSFERENCIA CTA SUC VIRTUAL", "-70,000.00"),
                ("30/09", "PAGO SUC VIRT TC MASTER PESOS", "-453,766.00"),
            ];
        }

        return Build(wb =>
        {
            var ws = wb.AddWorksheet("Extracto");
            var row = 2; // la fila 1 viene vacía en el original

            void Block()
            {
                Put(ws, row++, "Información Cliente:");
                Put(ws, row++, "CLIENTE", "DIRECCIÓN", "CIUDAD");
                Put(ws, row++, "CLIENTE DE PRUEBA", "CALLE FALSA 123", "MEDELLIN ANTIOQUIA");
                Put(ws, row++, "Información General:");
                Put(ws, row++, "DESDE", "HASTA", "TIPO CUENTA", "NRO CUENTA", "SUCURSAL");
                Put(ws, row++, desde, hasta, "CUENTA DE AHORROS", "000000001", "SUCURSAL PRUEBA");
            }

            Block();
            Put(ws, row++, "Resumen:");
            Put(ws, row++, "SALDO ANTERIOR", "TOTAL ABONOS", "TOTAL CARGOS", "SALDO ACTUAL");
            Put(ws, row++, "1,000,000.00", "1,443,063.37", "623,766.00", "1,819,297.37");
            Put(ws, row++, "Movimientos:");
            Put(ws, row++, "FECHA", "DESCRIPCIÓN", "SUCURSAL", "DCTO.", "VALOR", "SALDO");

            for (var i = 0; i < movements.Length; i++)
            {
                var (date, description, amount) = movements[i];
                Put(ws, row++, date, description, "", "", amount, "0.00");

                if (i == 2 && movements.Length > 3)
                {
                    Block();
                    Put(ws, row++, "Movimientos:");
                    Put(ws, row++, "FECHA", "DESCRIPCIÓN", "SUCURSAL", "DCTO.", "VALOR", "SALDO");
                }
            }

            Put(ws, row, "", "FIN ESTADO DE CUENTA");
        });
    }

    /// <summary>
    /// Tarjeta de crédito: hojas PESOS y DOLARES, "Moneda:" arriba, encabezado en la fila 7, cargos en positivo,
    /// fila de continuación "VR MONEDA ORIG…" sin fecha, y sección "Movimientos antes del periodo" que no se importa.
    /// </summary>
    public static MemoryStream CreditCard() => Build(wb =>
    {
        void Sheet(string name, string currency, (string Auth, string Date, string Description, string Amount)[] movements)
        {
            var ws = wb.AddWorksheet(name);
            var row = 1;
            Put(ws, row++, "Información Cliente:");
            Put(ws, row++, "Cliente", "", "Dirección", "Ciudad");
            Put(ws, row++, "CLIENTE DE PRUEBA", "", "CALLE FALSA 123", "MEDELLIN");
            Put(ws, row++, "Moneda: ", currency);
            Put(ws, row++, "Pago total", "4.342.466,00");
            Put(ws, row++, "Movimientos durante el periodo");
            Put(ws, row++, "Número de autorización", "Fecha", "Movimientos", "Valor Movimiento", "Número de cuotas", "Valor cuota/abono", "Saldo pendiente");
            row++; // fila vacía: no debe cortar la tabla

            foreach (var (auth, date, description, amount) in movements)
            {
                if (date.Length == 0)
                    Put(ws, row++, "", "", description); // continuación
                else
                    Put(ws, row++, auth, date, description, amount, "1/1", amount, "0,00");
            }

            Put(ws, row++, "Movimientos antes del periodo");
            Put(ws, row++, "Número de autorización", "Fecha", "Movimientos", "Valor Movimiento", "Número de cuotas", "Valor cuota/abono", "Saldo pendiente");
            Put(ws, row, "000000", "14/09/2026", "AMPLIACION DE PLAZO", "4.513.060,59", "2/12", "376.088,38", "3.760.883,67");
        }

        Sheet("PESOS", "PESOS",
        [
            ("", "15/10/2026", "INTERESES CORRIENTES", "92.214,12"),
            ("R00001", "14/10/2026", "Didi", "5.840,00"),
            ("C00002", "30/09/2026", "ABONO SUCURSAL VIRTUAL", "-453.766,00"),
        ]);
        Sheet("DOLARES", "DOLARES",
        [
            ("T00003", "05/10/2026", "WL *STEAM PURCHASE", "2,60"),
            ("", "", "VR MONEDA ORIG 8600.0 USA", ""),
            ("R00004", "22/09/2026", "SUSCRIPCION SOFTWARE", "20,00"),
        ]);
    });

    private static void Put(IXLWorksheet ws, int row, params string[] values)
    {
        for (var i = 0; i < values.Length; i++)
        {
            if (values[i].Length > 0)
                ws.Cell(row, i + 1).Value = values[i]; // todo texto, como lo exporta el banco
        }
    }

    private static MemoryStream Build(Action<XLWorkbook> fill)
    {
        using var wb = new XLWorkbook();
        fill(wb);
        var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }
}
