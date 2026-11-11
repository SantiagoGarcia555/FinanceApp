/*
 * Cliente de la API móvil con fetch simulado: transporte del refresh token en el body,
 * refresh single-flight ante 401, expiración, errores de red y mensajes de error de ASP.NET.
 */
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { login, logout } from '../src/api/auth'
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  api,
  configureClient,
  memoryTokenStore,
  onSessionChange,
  readErrorMessage,
  refreshSession,
  type TokenStore,
} from '../src/api/client'
import type { AuthResponse } from '../src/api/types'

interface Call {
  url: string
  headers: Record<string, string>
  body: unknown
}

const user = { id: 'u1', email: 'ana@test.co', name: 'Ana Pérez', preferredCurrency: 'COP' }
const authResponse = (n: number, accessToken = `access-${n}`): AuthResponse => ({
  accessToken,
  refreshToken: `refresh-${n}`,
  accessTokenExpiresAt: '2026-11-06T00:15:00Z',
  user,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let calls: Call[]
let store: TokenStore
let routes: (call: Call) => Response | Promise<Response>

function install(initialToken: string | null = null) {
  calls = []
  store = memoryTokenStore(initialToken)
  configureClient({
    baseUrl: 'https://api.test/',
    tokenStore: store,
    fetch: async (input, init) => {
      const call: Call = {
        url: String(input),
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
      }
      calls.push(call)
      return routes(call)
    },
  })
}

beforeEach(async () => {
  install()
  routes = () => new Response(null, { status: 204 })
  await logout() // resetea el access token en memoria entre tests
  calls = []
})

test('login guarda el refresh token del body y usa el access token como Bearer', async () => {
  routes = (c) => (c.url.endsWith('/api/auth/login') ? json(200, authResponse(1)) : json(200, { ok: true }))
  await login({ email: 'ana@test.co', password: 'secreta123' })
  assert.equal(await store.get(), 'refresh-1')

  await api('/api/dashboard/summary')
  const last = calls.at(-1)!
  assert.equal(last.url, 'https://api.test/api/dashboard/summary')
  assert.equal(last.headers.Authorization, 'Bearer access-1')
  // móvil nunca pide el transporte por cookie
  assert.ok(calls.every((c) => !('X-Auth-Transport' in c.headers)))
})

test('al arrancar sin access token, renueva con el refresh guardado (en el body) y rota el token', async () => {
  install('refresh-guardado')
  routes = (c) => (c.url.endsWith('/refresh') ? json(200, authResponse(2)) : json(200, []))
  await api('/api/categories')

  assert.equal(calls[0].url, 'https://api.test/api/auth/refresh')
  assert.deepEqual(calls[0].body, { refreshToken: 'refresh-guardado' })
  assert.equal(calls[1].headers.Authorization, 'Bearer access-2')
  assert.equal(await store.get(), 'refresh-2')
})

test('dos 401 simultáneos comparten UN solo refresh (single-flight) y ambos reintentan', async () => {
  let refreshes = 0
  routes = async (c) => {
    if (c.url.endsWith('/login')) return json(200, authResponse(0, 'access-vencido'))
    if (c.url.endsWith('/refresh')) {
      refreshes++
      await new Promise((r) => setTimeout(r, 10))
      return json(200, authResponse(3))
    }
    return c.headers.Authorization === 'Bearer access-3' ? json(200, { ok: true }) : json(401, '')
  }
  await login({ email: 'ana@test.co', password: 'x' })

  const results = await Promise.all([api('/api/a'), api('/api/b')])
  assert.deepEqual(results, [{ ok: true }, { ok: true }])
  assert.equal(refreshes, 1)
})

test('si el refresh es rechazado, limpia la sesión, avisa a los oyentes y lanza 401', async () => {
  install('refresh-revocado')
  routes = (c) => (c.url.endsWith('/refresh') ? json(401, 'Refresh token inválido o expirado.') : json(401, ''))
  const seen: Array<string | null> = []
  const off = onSessionChange((u) => seen.push(u?.id ?? null))

  await assert.rejects(api('/api/categories'), (e: unknown) => e instanceof ApiError && e.status === 401)
  assert.equal(await store.get(), null)
  assert.ok(seen.includes(null))
  off()
})

test('sin red: ApiError(0) con mensaje en español y el refresh token se conserva', async () => {
  install('refresh-ok')
  configureClient({
    fetch: async () => {
      throw new TypeError('Network request failed')
    },
  })
  await assert.rejects(refreshSession(), (e: unknown) => e instanceof ApiError && e.status === 0 && e.message === NETWORK_ERROR_MESSAGE)
  assert.equal(await store.get(), 'refresh-ok')
})

test('sin red con expo/fetch (FetchError "fetch failed: …"): mismo mensaje de conexión', async () => {
  install('refresh-ok')
  configureClient({
    fetch: async () => {
      throw new Error('fetch failed: Unable to resolve host')
    },
  })
  await assert.rejects(refreshSession(), (e: unknown) => e instanceof ApiError && e.status === 0 && e.message === NETWORK_ERROR_MESSAGE)
})

test('un error que no es de red (p. ej. body que fetch no sabe enviar) no culpa a la conexión', async () => {
  install('refresh-ok')
  configureClient({
    fetch: async () => {
      throw new Error('Unsupported FormDataPart implementation')
    },
  })
  await assert.rejects(
    refreshSession(),
    (e: unknown) => e instanceof ApiError && e.status === 0 && e.message.includes('Unsupported FormDataPart') && e.message !== NETWORK_ERROR_MESSAGE,
  )
})

test('logout borra el token local y lo envía en el body para revocarlo', async () => {
  routes = (c) => (c.url.endsWith('/login') ? json(200, authResponse(4)) : new Response(null, { status: 204 }))
  await login({ email: 'ana@test.co', password: 'x' })
  await logout()
  await new Promise((r) => setTimeout(r, 0))

  assert.equal(await store.get(), null)
  const call = calls.find((c) => c.url.endsWith('/api/auth/logout'))
  assert.deepEqual(call?.body, { refreshToken: 'refresh-4' })
})

test('readErrorMessage entiende string JSON, ProblemDetails y texto plano', async () => {
  assert.equal(await readErrorMessage(json(400, 'Ya existe una cuenta con ese email.')), 'Ya existe una cuenta con ese email.')
  assert.equal(
    await readErrorMessage(json(400, { title: 'One or more validation errors occurred.', errors: { Email: ['El email no es válido.'] } })),
    'El email no es válido.',
  )
  assert.equal(await readErrorMessage(new Response('Demasiados intentos.', { status: 429 })), 'Demasiados intentos.')
  assert.equal(await readErrorMessage(new Response('', { status: 503 })), 'El servidor tuvo un problema. Intenta de nuevo en un momento.')
})
