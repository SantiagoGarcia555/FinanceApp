# Arquitectura — Finance APP

## Objetivo del producto

App multiplataforma de finanzas personales que ayuda al usuario a entender
su gasto, le da consejos y detecta oportunidades de ahorro, y predice gasto
futuro usando IA/ML propio (sin depender de APIs de pago por uso). Empieza
como app Android, con extensión planeada a iOS, web y escritorio, y con
visión de monetizar vía suscripción freemium/premium en Play Store (y luego
App Store).

Fuentes de datos de transacciones, en orden de implementación:
1. Entrada manual + importación de extractos CSV/Excel (MVP).
2. Open Banking (fase futura) — cuentas bancarias conectadas vía agregador.
3. Notificaciones de pago (Android, opcional, no oficial) para wallets como
   Google Pay — ver limitación técnica abajo.

## Stack (decisión final, 2026-07-24)

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend / API | ASP.NET Core (.NET 8) + EF Core + PostgreSQL | Reutiliza experiencia previa del usuario en .NET; un único backend sirve a las 4 plataformas |
| Mobile (Android → iOS) | React Native + Expo | Reutiliza experiencia previa en React; un código para ambas plataformas |
| Web | React + Vite + Tailwind | Ya lo maneja el usuario; stack sin cambios |
| Escritorio | Tauri (empaqueta el frontend web) | Binarios livianos, reutiliza la UI web sin duplicar código |
| IA / predicciones | ML.NET dentro del propio backend (forecasting SSA, detección de anomalías, clustering de patrones de gasto) | Evita costos variables de APIs de LLM; corre junto al backend .NET |
| Open Banking (futuro) | Belvo (Colombia/Latam) como agregador principal; Salt Edge/Tink/TrueLayer si se expande a España/Europa (p. ej. Openbank) | Mercado objetivo inicial: Colombia/Latam |
| Monetización | Suscripción freemium/premium | Definido por el usuario |

La capa de integración bancaria se abstrae detrás de `IBankProviderAdapter`
(ver `backend/FinanceApp.Api/Services/IBankProviderAdapter.cs`) para poder
cambiar o agregar agregadores sin tocar el resto del backend.

## Limitación técnica importante: Google Wallet / billeteras virtuales

Google Wallet **no tiene una API pública para que apps de terceros lean el
historial de transacciones de un usuario** — la Google Wallet API está
pensada para emisores de tarjetas/pases (crear/actualizar passes), no para
consumir gasto de otras apps. Para "trazar" el gasto de una wallet hay que
usar una de estas alternativas: importación manual/CSV (ya cubierto en el
MVP), `NotificationListenerService` en Android para leer notificaciones de
pago (no oficial, frágil, requiere permiso sensible del usuario), u Open
Banking una vez el usuario conecta el banco directamente (deja de depender
de la wallet). Ver detalle en `mobile/README.md`.

## Roadmap por fases

1. **Fase 1 — MVP (Android + Web)**: CRUD de transacciones manual +
   importación CSV/Excel, categorías, panel de gastos por categoría/mes.
2. **Fase 2 — IA propia**: ML.NET para detectar anomalías/oportunidades de
   ahorro y predecir gasto del próximo mes por categoría.
3. **Fase 3 — Open Banking**: integrar Belvo (Colombia/Latam) detrás de
   `IBankProviderAdapter`; evaluar Openbank/Salt Edge si se expande a España.
4. **Fase 4 — Expansión de plataformas**: iOS (mismo código React Native),
   escritorio (Tauri sobre `web`).
5. **Fase 5 — Monetización**: suscripción freemium/premium, publicación en
   Play Store y luego App Store.
