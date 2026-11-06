# Finance APP — Mobile (React Native + Expo)

App Android (fase 1) e iOS (fase 4). Expo SDK 58 · React Native 0.88 · React 19 · TypeScript.

Estado: **1.3.0 completa**: tokens de diseño y librería de componentes "Raíz × Aurora".
La app abre un catálogo vivo de componentes (`src/screens/FundamentosScreen.tsx`, el equivalente a
`/fundamentos` en la web). Navegación (Expo Router) y autenticación llegan en 1.3.1.

## Correr en tu teléfono (sin Android Studio)

1. Instala **Expo Go** desde Play Store.
2. `cd mobile && npm install && npm start`
3. Escanea el QR con Expo Go (teléfono y PC en la misma red Wi-Fi; si la red lo bloquea:
   `npx expo start --tunnel`).

Expo Go trae los módulos nativos que usamos (SVG, fuentes, safe area), así que no hace falta
compilar nada. Cuando agreguemos un módulo nativo que Expo Go no traiga, pasamos a un
*development build* (`eas build --profile development`); eso llega en 1.3.6.

También corre en el navegador (`npm run web`, vía react-native-web), cómodo para revisar
rápido. **La referencia es el teléfono**: sombras, fuentes y teclado se comportan distinto.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo (QR para Expo Go) |
| `npm run web` | La app en el navegador |
| `npm run typecheck` | `tsc` de la app y de los tests |
| `npm run lint` | oxlint (mismo linter que la web) |
| `npm test` | Paridad de tokens y `format.ts` con la web (`node --test`, sin Jest) |
| `npm run doctor` | `expo-doctor`: versiones y config compatibles con el SDK |

Para agregar dependencias usa **`npx expo install <paquete>`** (no `npm install`): elige la
versión compatible con el SDK.

## Estructura

```
App.tsx                    carga fuentes (splash mientras tanto) + SafeAreaProvider
src/theme/
  tokens.ts                colores, espaciado, radios, sombras (espejo de web/src/styles/tokens.css)
  typography.ts            estilos de texto type.* (= utilidades type-* de la web) y familias
  fonts.ts                 useAppFonts: Fraunces 300/600/400i/600i + DM Sans 400/700
  motion.ts                curvas, useReducedMotion, useAnimatedValue
src/components/ui/         librería (mismos nombres y props que web/src/components/ui)
src/lib/format.ts          copia exacta de web/src/lib/format.ts (el test lo verifica)
src/screens/               pantallas (por ahora solo el catálogo)
tests/tokens.test.mts      paridad web ↔ móvil
```

## Cómo se traduce la web a React Native

| Web (Tailwind) | Mobile |
|---|---|
| `bg-canvas`, `text-fg-muted` | `colors.canvas`, `colors.fgMuted` |
| `type-h1`, `type-label` | `type.h1`, `type.label` |
| `p-4`, `rounded-lg` | `space[4]`, `radius.lg` |
| `shadow-card` | `boxShadow: shadows.card` (RN 0.76+, mismo string CSS) |
| `bg-fg/80` | `withAlpha(colors.fg, 0.8)` |
| `animate-rise` + `delay(300)` | `<Rise delay={300}>` |
| `onClick`, `to="/ruta"` | `onPress` (la navegación la decide la pantalla) |
| `<select>` | `SelectField` (abre una hoja inferior con las opciones) |
| `<dialog>` | `Sheet` (sobre `Modal`; el botón atrás de Android la cierra) |

Decisiones:
- **StyleSheet + tokens tipados, sin NativeWind.** NativeWind v4 depende de Tailwind v3 (la web
  usa v4) y suma Babel/Metro config; con tokens tipados el autocompletado de TS da lo mismo que
  las clases, y el test de paridad garantiza que no se desincronicen.
- **Pesos de fuente por familia**: en RN cada peso de Google Fonts es su propia familia
  (`Fraunces_600SemiBold`); no usar `fontWeight` con fuentes propias (Android cae a la del sistema).
- **Fuentes importadas por subruta** (`@expo-google-fonts/fraunces/600SemiBold`): el índice
  del paquete metería las 18 caras al bundle.
- **Íconos**: `lucide-react-native` (mismos nombres que `lucide-react`). Siempre pasar `color`.
- **Accesibilidad**: `accessibilityLabel`/`Role`/`State` en todo lo tocable, áreas táctiles
  ≥ 44 px (+ `hitSlop` hasta 48 dp) y animaciones que respetan "Quitar animaciones" de Android.

## Notas sobre "leer transacciones de Google Wallet / billeteras virtuales"

Google Wallet **no expone una API pública para que apps de terceros lean el historial de
transacciones**. Caminos reales: import manual/CSV (MVP), `NotificationListenerService` en
Android (frágil, permiso sensible) u Open Banking (fase 3). Ver `docs/ARCHITECTURE.md`.
