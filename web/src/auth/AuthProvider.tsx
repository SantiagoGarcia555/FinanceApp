import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { hasStoredSession, onSessionChange, refreshSession } from '../api/client'
import type { LoginRequest, RegisterRequest, UserResponse } from '../api/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (hasStoredSession() ? 'loading' : 'anonymous'))

  // Cualquier cambio de sesión (login, refresh, expiración en una petición) actualiza el estado.
  useEffect(
    () =>
      onSessionChange((next) => {
        setUser(next)
        setStatus(next ? 'authenticated' : 'anonymous')
      }),
    [],
  )

  // Al arrancar: si hay refresh token guardado, se renueva la sesión para obtener access token + usuario.
  useEffect(() => {
    if (!hasStoredSession()) return
    refreshSession()
      .then((auth) => {
        if (!auth) setStatus('anonymous')
      })
      .catch(() => setStatus('anonymous')) // servidor caído: se muestra el login, el token se conserva
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    await authApi.login(request)
  }, [])

  const register = useCallback(async (request: RegisterRequest) => {
    await authApi.register(request)
  }, [])

  const logout = useCallback(() => authApi.logout(), [])

  const value = useMemo<AuthContextValue>(() => ({ status, user, login, register, logout }), [status, user, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
