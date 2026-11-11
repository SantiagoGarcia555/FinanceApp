import { File } from 'expo-file-system'
import { configureClient } from './client'
import { API_URL } from './config'
import { configureFileReader } from './import'
import { secureTokenStore } from './tokenStore'

// Configuración única al importar la capa de API desde la app.
configureClient({ baseUrl: API_URL, tokenStore: secureTokenStore })
// Extractos a subir (file:// del selector o content:// de "Compartir con Tino")
configureFileReader((uri) => new File(uri).bytes())

export * as authApi from './auth'
export { ApiError, getBaseUrl, onSessionChange, refreshSession } from './client'
export type * from './types'
