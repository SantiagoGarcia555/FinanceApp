/*
 * xhrFetch (mobile/src/api/xhrFetch.ts): el transporte de subidas de archivos sobre XMLHttpRequest,
 * con un XHR falso (Node no trae XMLHttpRequest).
 */
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { xhrFetch } from '../src/api/xhrFetch'

type Outcome = { kind: 'load'; status: number; body: string; headers: string } | { kind: 'error' } | { kind: 'hang' }

let outcome: Outcome
const instances: FakeXhr[] = []
const last = () => instances[instances.length - 1]

class FakeXhr {
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown
  status = 0
  responseText = ''
  aborted = false
  private responseHeaders = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    instances.push(this)
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value
  }
  getAllResponseHeaders() {
    return this.responseHeaders
  }
  abort() {
    this.aborted = true
    this.onabort?.()
  }
  send(body: unknown) {
    this.body = body
    queueMicrotask(() => {
      if (outcome.kind === 'load') {
        this.status = outcome.status
        this.responseText = outcome.body
        this.responseHeaders = outcome.headers
        this.onload?.()
      } else if (outcome.kind === 'error') {
        this.onerror?.()
      }
    })
  }
}

const globals = globalThis as { XMLHttpRequest?: unknown }
const original = globals.XMLHttpRequest
globals.XMLHttpRequest = FakeXhr
after(() => {
  globals.XMLHttpRequest = original
})

test('envía método, URL, encabezados y el body tal cual (sin forzar Content-Type)', async () => {
  outcome = { kind: 'load', status: 200, body: '{"headers":["FECHA"]}', headers: 'Content-Type: application/json\r\nX-Test: 1\r\n' }
  const form = new FormData()
  const res = await xhrFetch('https://api.test/api/transactions/import/inspect', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer a1' },
    body: form,
  })
  assert.equal(last().method, 'POST')
  assert.equal(last().url, 'https://api.test/api/transactions/import/inspect')
  assert.deepEqual(last().headers, { Accept: 'application/json', Authorization: 'Bearer a1' })
  assert.equal(last().body, form)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/json')
  assert.equal(res.headers.get('x-test'), '1')
  assert.deepEqual(await res.json(), { headers: ['FECHA'] })
})

test('respuestas de error (400) llegan como Response para que client.ts lea el mensaje', async () => {
  outcome = { kind: 'load', status: 400, body: '"Moneda no soportada"', headers: 'content-type: application/json' }
  const res = await xhrFetch('https://api.test/x', { method: 'POST' })
  assert.equal(res.status, 400)
  assert.equal(await res.text(), '"Moneda no soportada"')
})

test('204 sin body', async () => {
  outcome = { kind: 'load', status: 204, body: '', headers: '' }
  const res = await xhrFetch('https://api.test/x', { method: 'DELETE' })
  assert.equal(res.status, 204)
  assert.equal(await res.text(), '')
})

test('sin red: TypeError, igual que el fetch de React Native', async () => {
  outcome = { kind: 'error' }
  await assert.rejects(xhrFetch('https://api.test/x'), (e: unknown) => e instanceof TypeError)
})

test('abortar cancela el XHR y rechaza con AbortError', async () => {
  outcome = { kind: 'hang' }
  const controller = new AbortController()
  const pending = xhrFetch('https://api.test/x', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, (e: unknown) => e instanceof Error && e.name === 'AbortError')
  assert.equal(last().aborted, true)
})
