import { api, clearSession, setSession } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from './types'

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const auth = await api<AuthResponse>('/api/auth/login', { method: 'POST', json: request, auth: false })
  setSession(auth)
  return auth
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const auth = await api<AuthResponse>('/api/auth/register', { method: 'POST', json: request, auth: false })
  setSession(auth)
  return auth
}

/** Cierra la sesión local de inmediato; la API revoca el refresh token y borra la cookie. */
export function logout(): void {
  clearSession()
  api<void>('/api/auth/logout', { method: 'POST', json: {}, auth: false }).catch(() => {
    // si falla, la cookie expira sola; la sesión local ya está cerrada
  })
}
