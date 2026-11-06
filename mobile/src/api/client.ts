import type { AuthResponse, UserResponse } from './types'

/**
 * Cliente HTTP de la API para la app móvil (equivalente a web/src/api/client.ts).
 *
 * Sesión (móvil):
 * - access token (15 min) → solo en memoria.
 * - refresh token (30 días, rotativo) → viaja en el BODY (sin el header `X-Auth-Transport: cookie`
 *   que usa la web) y se guarda cifrado en el dispositivo (expo-secure-store, ver tokenStore.ts).
 *
 * Ante un 401 se intenta UN refresh y se reintenta la petición. El refresh es "single-flight":
 * llamadas simultáneas comparten la misma promesa, porque el token rota y usarlo dos veces
 * invalidaría la sesión.
 *
 * Sin imports de React Native: se prueba con Node (tests/client.test.mts).
 */

/** Dónde guardar el refresh token. En la app: SecureStore; en los tests: memoria. */
export interface TokenStore {
  get(): Promise<string | null>
  set(token: string): Promise<void>
  clear(): Promise<void>
}

export function memoryTokenStore(initial: string | null = null): TokenStore {
  let value = initial
  return {
    get: async () => value,
    set: async (token) => {
      value = token
    },
    clear: async () => {
      value = null
    },
  }
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const NETWORK_ERROR_MESSAGE = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'

// ---------- Configuración ----------

let baseUrl = ''
let tokenStore: TokenStore = memoryTokenStore()
let fetchImpl: typeof fetch = (...args) => fetch(...args)

export function configureClient(options: { baseUrl?: string; tokenStore?: TokenStore; fetch?: typeof fetch }) {
  if (options.baseUrl !== undefined) baseUrl = options.baseUrl.replace(/\/+$/, '')
  if (options.tokenStore) tokenStore = options.tokenStore
  if (options.fetch) fetchImpl = options.fetch
}

export function getBaseUrl(): string {
  return baseUrl
}

// ---------- Estado de sesión ----------

let accessToken: string | null = null
let refreshInFlight: Promise<AuthResponse | null> | null = null
const listeners = new Set<(user: UserResponse | null) => void>()

function notify(user: UserResponse | null) {
  for (const listener of listeners) listener(user)
}

export async function setSession(auth: AuthResponse): Promise<void> {
  accessToken = auth.accessToken
  if (auth.refreshToken) await tokenStore.set(auth.refreshToken)
  notify(auth.user)
}

export async function clearSession(): Promise<void> {
  accessToken = null
  await tokenStore.clear()
  notify(null)
}

/** El refresh token guardado (para enviarlo al cerrar sesión y revocarlo en el servidor). */
export function readStoredRefreshToken(): Promise<string | null> {
  return tokenStore.get()
}

/** Se suscribe a cambios de sesión (login, refresh, expiración). Devuelve la función para desuscribirse. */
export function onSessionChange(listener: (user: UserResponse | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------- Utilidades HTTP ----------

async function safeFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(`${baseUrl}${path}`, init)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }
}

/** La API devuelve texto plano (BadRequest("…")) o ProblemDetails en JSON (validación de modelo). */
export async function readErrorMessage(res: Response): Promise<string> {
  const fallback = res.status >= 500 ? 'El servidor tuvo un problema. Intenta de nuevo en un momento.' : `Error ${res.status}`
  try {
    const text = await res.text()
    if (!text) return fallback
    if (res.headers.get('content-type')?.includes('json')) {
      const parsed: unknown = JSON.parse(text)
      // Con Accept: application/json, ASP.NET serializa BadRequest("…") como string JSON
      if (typeof parsed === 'string') return parsed || fallback
      const body = parsed as { title?: string; detail?: string; errors?: Record<string, string[]> }
      const firstFieldError = body.errors ? Object.values(body.errors).flat()[0] : undefined
      return firstFieldError ?? body.detail ?? body.title ?? fallback
    }
    return text.replace(/^"|"$/g, '')
  } catch {
    return fallback
  }
}

// ---------- Refresh ----------

/**
 * Renueva la sesión con el refresh token guardado. Devuelve null si no hay sesión válida
 * (y la limpia). Lanza ApiError(0) si no hay red: el token se conserva para reintentar.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const refreshToken = await tokenStore.get()
      if (!refreshToken) return null
      const res = await safeFetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (res.status === 400 || res.status === 401) {
        await clearSession()
        return null
      }
      if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
      const auth = (await res.json()) as AuthResponse
      await setSession(auth)
      return auth
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

// ---------- Petición principal ----------

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Objeto a serializar como JSON. */
  json?: unknown
  /** multipart/form-data (subida de archivos). */
  form?: FormData
  /** false para endpoints públicos (login/registro/logout). */
  auth?: boolean
}

export async function api<T>(path: string, { json, form, auth = true, headers, ...init }: RequestOptions = {}, retried = false): Promise<T> {
  if (auth && !accessToken) await refreshSession()

  const res = await safeFetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined && { 'Content-Type': 'application/json' }),
      ...(auth && accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : form,
  })

  if (res.status === 401 && auth) {
    if (!retried && (await refreshSession())) return api<T>(path, { json, form, auth, headers, ...init }, true)
    await clearSession()
    throw new ApiError(401, 'Tu sesión expiró. Vuelve a ingresar.')
  }

  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
  if (res.status === 204 || res.status === 205) return undefined as T
  return (await res.json()) as T
}
