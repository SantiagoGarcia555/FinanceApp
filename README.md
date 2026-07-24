# Finance APP

App multiplataforma de finanzas personales: registro de gastos, consejos y
oportunidades de ahorro, y predicciones de gasto, con planes de integrar
Open Banking y billeteras virtuales más adelante.

## Estructura del monorepo

```
finance-app/
  backend/    ASP.NET Core Web API (.NET 8) — core de negocio, único para todas las plataformas
  web/        React + Vite + Tailwind — panel web
  mobile/     React Native + Expo (Android ahora, iOS después)
  desktop/    Tauri, empaqueta el frontend web como app nativa
  docs/       Arquitectura y roadmap
```

Un único backend en .NET sirve a las cuatro plataformas por REST API — evita
duplicar reglas de negocio (categorización, cálculo de insights, etc.).

## Cómo correr en local

**Backend**
```bash
cd backend/FinanceApp.Api
dotnet restore
dotnet run
```
Requiere PostgreSQL local corriendo (ver `appsettings.json` para la cadena de
conexión) y el SDK de .NET 8.

**Web**
```bash
cd web
npm install
npm run dev
```

**Mobile / Desktop**: ver el `README.md` de cada carpeta — todavía no están
inicializados (requieren Android Studio / toolchain de Tauri en tu máquina).

## Documentación

Ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) para el detalle de
arquitectura, decisiones técnicas y roadmap por fases.
