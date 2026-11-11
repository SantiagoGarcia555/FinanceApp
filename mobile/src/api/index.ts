import { Platform } from 'react-native'
import { configureClient } from './client'
import { API_URL } from './config'
import { secureTokenStore } from './tokenStore'
import { xhrFetch } from './xhrFetch'

// Configuración única al importar la capa de API desde la app.
// Subidas de archivos por XMLHttpRequest: expo/fetch no acepta la parte { uri } (ver xhrFetch.ts).
// En el navegador (react-native-web) el archivo ya es un Blob y basta el fetch normal.
configureClient({ baseUrl: API_URL, tokenStore: secureTokenStore, uploadFetch: Platform.OS === 'web' ? null : xhrFetch })

export * as authApi from './auth'
export { ApiError, getBaseUrl, onSessionChange, refreshSession } from './client'
export type * from './types'
