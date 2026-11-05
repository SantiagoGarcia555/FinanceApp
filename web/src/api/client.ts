import type { AuthResponse, UserResponse } from './types'

/**
 * Cliente HTTP de la API.
 *
 * Sesión (web):
 * - access token (15 min) → solo en memoria.
 * - refresh token (30 días, rotativo) → cookie HttpOnly + Secure + SameSite=Strict que pone la API
 *   (header `X-Auth-Transport: cookie`). JavaScript nunca lo ve, así un XSS no puede robarlo.
 * - En localStorage solo queda una pista NO sensible ("hay sesión") para no llamar a /refresh en
 *   vano cuando el usuario nunca ingresó.
 *
 * Ante un 401 se intenta UN refresh y se reintenta la petición. El refresh es "single-flight":
 * llamadas simultáneas comparten la misma promesa, porque el token rota y usarlo dos veces
 * invalidaría la sesión (pasa con React StrictMode en dev).
 */

const API_BASE: string = import.meta.env.VITE_API_URL ?? ''
const SESSION_HINT_KEY = 'finance-app.has-session'
const AUTH_TRANSPORT_HEADERS = { 'X-Auth-Transport': 'cookie' } as const

// Limpieza: versiones anteriores guardaban el refresh token en localStorage.
try {
  localStorage.removeItem('finance-app.refresh-token')
} catch {
  // almacenamiento no disponible
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---------- Estado de sesión ----------

let accessToken: string | null = null
let refreshInFlight: Promise<AuthResponse | null> | null = null
const listeners = new Set<(user: UserResponse | null) => void>()

function setSessionHint(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1')
    else localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // modo privado estricto: sin pista, la sesión dura lo que la pestaña
  }
}

function notify(user: UserResponse | null) {
  for (const listener of listeners) listener(user)
}

export function setSession(auth: AuthResponse) {
  accessToken = auth.accessToken
  setSessionHint(true)
  notify(auth.user)
}

export function clearSession() {
  accessToken = null
  setSessionHint(false)
  notify(null)
}

/** ¿Vale la pena intentar renovar la sesión al arrancar? (la cookie en sí no es legible desde JS) */
export function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

/** Se suscribe a cambios de sesión (login, refresh, expiración). Devuelve la función para desuscribirse. */
export function onSessionChange(listener: (user: UserResponse | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------- Utilidades HTTP ----------

async function safeFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    // same-origin: el navegador envía la cookie de refresh solo a /api/auth (Path de la cookie)
    return await fetch(input, { credentials: 'same-origin', ...init })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
  }
}

/** La API devuelve texto plano (BadRequest("…")) o ProblemDetails en JSON (validación de modelo). */
async function readErrorMessage(res: Response): Promise<string> {
  const fallback = res.status >= 500 ? 'El servidor tuvo un problema. Intenta de nuevo en un momento.' : `Error ${res.status}`
  try {
    const text = await res.text()
    if (!text) return fallback
    if (res.headers.get('content-type')?.includes('json')) {
      const body = JSON.parse(text) as { title?: string; detail?: string; errors?: Record<string, string[]> }
      const firstFieldError = body.errors ? Object.values(body.errors).flat()[0] : undefined
      return firstFieldError ?? body.detail ?? body.title ?? fallback
    }
    return text.replace(/^"|"$/g, '')
  } catch {
    return fallback
  }
}

// ---------- Refresh ----------

/** Renueva la sesión con la cookie de refresh. Devuelve null si no hay sesión válida. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const res = await safeFetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...AUTH_TRANSPORT_HEADERS },
        body: '{}',
      })
      if (res.status === 400 || res.status === 401) {
        clearSession()
        return null
      }
      if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
      const auth = (await res.json()) as AuthResponse
      setSession(auth)
      return auth
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

// ---------- Petición principal ----------

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Objeto a serializar como JSON. */
  json?: unknown
  /** false para endpoints públicos (login/registro/logout). */
  auth?: boolean
}

export async function api<T>(path: string, { json, auth = true, headers, ...init }: RequestOptions = {}, retried = false): Promise<T> {
  if (auth && !accessToken && hasStoredSession()) await refreshSession()

  const res = await safeFetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined && { 'Content-Type': 'application/json' }),
      ...(auth && accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...(path.startsWith('/api/auth/') && AUTH_TRANSPORT_HEADERS),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })

  if (res.status === 401 && auth) {
    if (!retried && (await refreshSession())) return api<T>(path, { json, auth, headers, ...init }, true)
    clearSession()
    throw new ApiError(401, 'Tu sesión expiró. Vuelve a ingresar.')
  }

  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
  if (res.status === 204 || res.status === 205) return undefined as T
  return (await res.json()) as T
}
