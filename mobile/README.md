# Finance APP — Mobile (React Native + Expo)

App Android (fase 1) e iOS (fase 4). Expo SDK 58 · React Native 0.88 · React 19 · TypeScript.

Estado:
- **1.3.0**: tokens de diseño y librería de componentes "Raíz × Aurora".
- **1.3.1**: Expo Router + login/registro contra la **API de producción**, sesión persistente
  (refresh token cifrado con expo-secure-store) y tabs con la nav flotante. El catálogo de componentes está en Perfil.
- **1.3.2**: Inicio = dashboard con datos reales (reglas comunes con la web en `shared/dashboard.ts`).
- **1.3.3**: alta rápida desde el `+` (monto → categoría → Guardar) y edición/eliminación en la misma hoja.
- **1.3.4**: Billetera = movimientos del mes con filtros, agrupados por día y con scroll infinito.
- **1.3.6** (en curso): `eas.json` listo; el primer build espera el `android.package` (branding). Ver
  [Builds instalables](#builds-instalables-eas-136). Análisis sigue en "muy pronto".

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
| `npm run start:tunnel` | Igual, por túnel ngrok (redes que aíslan dispositivos, p. ej. la de la oficina) |
| `npm run web` | La app en el navegador |
| `npm run typecheck` | `tsc` de la app y de los tests |
| `npm run lint` | oxlint (mismo linter que la web) |
| `npm test` | Paridad de tokens con la web + cliente de la API con fetch simulado (`node --test` + tsx) |
| `npm run doctor` | `expo-doctor`: versiones y config compatibles con el SDK |

Para agregar dependencias usa **`npx expo install <paquete>`** (no `npm install`): elige la
versión compatible con el SDK.

## Builds instalables (EAS, 1.3.6)

Se compilan en la nube de Expo (EAS Build): esta máquina no tiene Android SDK. Perfiles en `eas.json`:

| Perfil | Qué produce | Para qué |
|---|---|---|
| `preview` | APK independiente (JS empaquetado, apunta a producción) | Instalarla y usarla a diario sin la PC (1.4.3) |
| `development` | APK "dev client": reemplaza a Expo Go con nuestro código nativo | Desarrollar 1.3.5 (compartir archivo → intent filters, no corre en Expo Go) |
| `production` | AAB para Play Store | Fase 5 |

**Pendiente antes del primer build:** definir `expo.android.package` en `app.json` (se decide en el
ejercicio de branding; queda fijo para siempre tras la primera subida a Play Store).

Pasos (una sola vez):

1. Token de acceso en https://expo.dev → Account settings → Access tokens (`npx expo login` falla en
   Windows). En la terminal: `$env:EXPO_TOKEN = "<token>"` (PowerShell). No se guarda en el repo.
2. `npx eas-cli@latest init` → vincula el proyecto a tu cuenta (agrega `extra.eas.projectId` a `app.json`).
3. Agregar `"package": "com.<…>"` dentro de `"android"` en `app.json`.
4. Solo para el perfil `development`: `npx expo install expo-dev-client`. Ojo: con ese paquete,
   `npm start` abre el dev client en vez de Expo Go (para seguir con Expo Go: `npx expo start --go`).

Builds:

```
npx eas-cli@latest build -p android --profile preview      # APK para usar a diario
npx eas-cli@latest build -p android --profile development  # dev client
```

Al terminar, EAS da un link/QR para descargar el APK en el teléfono (hay que permitir "instalar apps
de origen desconocido" para el navegador). La primera vez EAS ofrece generar el keystore de firma:
aceptar (lo guarda EAS; no perderlo, sin él no se pueden publicar actualizaciones en Play Store).

## Estructura

```
src/app/                   rutas (Expo Router: cada archivo es una pantalla)
  _layout.tsx              fuentes + splash, AuthProvider y rutas protegidas (Stack.Protected)
  ingresar.tsx, registro.tsx
  (tabs)/_layout.tsx       Tabs con BottomNav como barra; index, analisis, billetera, perfil
  fundamentos.tsx          catálogo vivo (se abre desde Perfil)
src/api/                   cliente HTTP (refresh token en el body, single-flight), auth, tokenStore
src/auth/                  AuthProvider / useAuth (status: loading | authenticated | anonymous)
src/theme/
  tokens.ts                colores, espaciado, radios, sombras (espejo de web/src/styles/tokens.css)
  typography.ts            estilos de texto type.* (= utilidades type-* de la web) y familias
  fonts.ts                 useAppFonts: Fraunces 300/600/400i/600i + DM Sans 400/700
  motion.ts                curvas, useReducedMotion, useAnimatedValue
src/components/ui/         librería (mismos nombres y props que web/src/components/ui)
src/lib/format.ts, src/api/types.ts  reexportan ../shared (código común con la web, una sola fuente)
tests/                     tokens.test.mts (paridad con la web), client.test.mts (cliente de la API)
```

## API y sesión

- Por defecto apunta a **producción** (`https://finance-app-8psx.onrender.com`). Para usar otra:
  `$env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:64348"; npx expo start` (la API local por LAN).
- Render free se duerme tras 15 min: el primer request tarda ~1 min. La app avisa
  "Despertando el servidor…" si una espera pasa de 4 s.
- Access token en memoria; refresh token (30 días, rotativo) en **expo-secure-store**, enviado en el
  body (la web usa cookie HttpOnly; aquí no hay cookies). Cerrar sesión lo revoca en la API.
- El preview web (`npm run web`) **no puede iniciar sesión contra producción** (la API no tiene CORS
  para otros orígenes; la app nativa no usa CORS). Sirve para revisar pantallas.

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
