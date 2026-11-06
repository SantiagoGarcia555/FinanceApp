/**
 * URL de la API. Por defecto, producción (Render). Para apuntar a otra (p. ej. la API local por LAN):
 *   EXPO_PUBLIC_API_URL=http://192.168.1.25:64348 npx expo start
 * (Expo inyecta las variables EXPO_PUBLIC_* al empaquetar.)
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://finance-app-8psx.onrender.com'
