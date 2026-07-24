# Finance APP — Mobile (React Native + Expo)

App Android (fase 1) e iOS (fase futura), construida en React Native para
reutilizar el conocimiento de React que ya tienes del frontend web.

## Por qué React Native + Expo

- Un solo código para Android e iOS.
- Reutiliza tipos, cliente de API y lógica de negocio compartida con el
  proyecto `web` (mismo lenguaje: TypeScript).
- Expo simplifica el build/firma para Play Store y App Store, y da acceso a
  notificaciones push, cámara, etc. sin configurar Gradle/Xcode a mano.

## Cómo inicializar (ejecutar en tu máquina local, con Android Studio/Node instalados)

```bash
cd finance-app/mobile
npx create-expo-app@latest . --template blank-typescript
npx expo install nativewind tailwindcss   # Tailwind también en mobile
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install expo-secure-store        # guardar el JWT de forma segura
```

## Estructura sugerida una vez inicializado

```
mobile/
  app/                 # pantallas (Expo Router) o /src/screens si usas React Navigation
  src/
    api/               # cliente HTTP hacia la API .NET (compartir tipos con /web)
    components/
    hooks/
  app.json
  package.json
```

## Notas sobre "leer transacciones de Google Wallet / billeteras virtuales"

Google Wallet **no expone una API pública para que apps de terceros lean el
historial de transacciones de un usuario** (la Google Wallet API es para
emisores de tarjetas/pases, no para consumir gasto). Para este objetivo hay
dos caminos reales:

1. **Import manual/CSV** (ya definido para el MVP): el usuario exporta el
   movimiento desde su banco/wallet y lo sube a la app.
2. **NotificationListenerService (Android, no oficial)**: leer las
   notificaciones push de pago que Google Pay/el banco emiten y parsear el
   monto/comercio. Es una técnica común en apps de finanzas personales, pero
   depende del formato de cada notificación (frágil) y requiere permiso
   explícito y sensible del usuario (acceso a notificaciones).
3. **Open Banking (fase futura)**: una vez el usuario conecta su banco vía
   Belvo/Salt Edge, ya no depende de la wallet — se trae el movimiento
   directo de la cuenta.

Documentado también en `docs/ARCHITECTURE.md`.
