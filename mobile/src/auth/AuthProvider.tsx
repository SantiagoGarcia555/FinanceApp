import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, onSessionChange, refreshSession } from '../api'
import type { LoginRequest, RegisterRequest, UserResponse } from '../api/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Cualquier cambio de sesión (login, refresh, expiración en una petición) actualiza el estado.
  useEffect(
    () =>
      onSessionChange((next) => {
        setUser(next)
        setStatus(next ? 'authenticated' : 'anonymous')
      }),
    [],
  )

  // Al abrir la app: si hay refresh token guardado, se renueva la sesión (access token + usuario).
  // Con Render free el primer request puede tardar ~1 min (servidor dormido): la UI lo avisa.
  useEffect(() => {
    refreshSession()
      .then((auth) => {
        if (!auth) setStatus('anonymous')
      })
      .catch(() => setStatus('anonymous')) // sin red: se muestra el login; el token se conserva
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
