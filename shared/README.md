# shared/

TypeScript puro que usan **web/** y **mobile/** (una sola fuente; cambiar aquí cambia ambas apps).

- `api-types.ts`: contratos de la API (espejo de `backend/FinanceApp.Api/Dtos`, camelCase).
- `format.ts`: formato es-CO (COP, fechas relativas).

Reglas: sin imports de paquetes (ni React, ni DOM, ni React Native) y sin acceso a `window`/`document`.
Cada app lo reexporta desde su ruta de siempre (`web/src/lib/format.ts`, `mobile/src/lib/format.ts`, …).

Configuración que lo hace posible: `web/vite.config.ts` (`server.fs.allow`), `web/tsconfig.app.json`
(`include`), `mobile/metro.config.js` (`watchFolders`) y el `Dockerfile` (copia `shared/`).
