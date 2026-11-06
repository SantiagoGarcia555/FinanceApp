import { configureClient } from './client'
import { API_URL } from './config'
import { secureTokenStore } from './tokenStore'

// Configuración única al importar la capa de API desde la app.
configureClient({ baseUrl: API_URL, tokenStore: secureTokenStore })

export * as authApi from './auth'
export { ApiError, getBaseUrl, onSessionChange, refreshSession } from './client'
export type * from './types'
