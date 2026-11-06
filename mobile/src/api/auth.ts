import { api, clearSession, readStoredRefreshToken, setSession } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from './types'

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const auth = await api<AuthResponse>('/api/auth/login', { method: 'POST', json: request, auth: false })
  await setSession(auth)
  return auth
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const auth = await api<AuthResponse>('/api/auth/register', { method: 'POST', json: request, auth: false })
  await setSession(auth)
  return auth
}

/**
 * Cierra la sesión local de inmediato y pide a la API revocar el refresh token
 * (en móvil va en el body; si la llamada falla, el token igual expira a los 30 días).
 */
export async function logout(): Promise<void> {
  const refreshToken = await readStoredRefreshToken()
  await clearSession()
  if (!refreshToken) return
  api<void>('/api/auth/logout', { method: 'POST', json: { refreshToken }, auth: false }).catch(() => {
    // la sesión local ya está cerrada
  })
}
