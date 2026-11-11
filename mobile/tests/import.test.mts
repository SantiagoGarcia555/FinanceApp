/*
 * Importador móvil (1.3.5): reglas de mobile/src/features/import/importFlow.ts y llamadas de
 * mobile/src/api/import.ts con fetch simulado.
 */
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { configureClient, memoryTokenStore, setSession } from '../src/api/client'
import { confirmImport, filePart, inspectImport, previewImport, type UploadFile } from '../src/api/import'
import type { ImportInspectResponse, ImportRowPreview } from '../src/api/types'
import {
  buildConfirmRows,
  defaultSelection,
  fileFromPicker,
  fileFromShare,
  foreignCurrency,
  fromRouteParams,
  importableRows,
  initialMapping,
  MAX_BYTES,
  roleOf,
  toggleRow,
  toRouteParams,
  uploadName,
  validateFile,
  validateMapping,
} from '../src/features/import/importFlow'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const row = (rowNumber: number, patch: Partial<ImportRowPreview> = {}): ImportRowPreview => ({
  rowNumber,
  date: '2026-10-05T00:00:00',
  amount: -38900,
  description: 'Compra Éxito',
  isDuplicate: false,
  error: null,
  yearInferred: false,
  ...patch,
})

const inspect = (patch: Partial<ImportInspectResponse> = {}): ImportInspectResponse => ({
  headers: ['FECHA', 'DESCRIPCIÓN', 'VALOR'],
  sampleRows: [['5/10', 'Compra Éxito', '-38.900']],
  suggestedDateColumn: 'FECHA',
  suggestedAmountColumn: 'VALOR',
  suggestedDescriptionColumn: 'DESCRIPCIÓN',
  sheets: [],
  sheet: null,
  detectedCurrency: null,
  suggestInvertSign: false,
  periodStart: null,
  periodEnd: null,
  ...patch,
})

// ---------- Nombre y validación del archivo ----------

test('uploadName conserva .csv/.xlsx y deduce la extensión del MIME cuando falta', () => {
  assert.equal(uploadName('Extracto Octubre.XLSX', XLSX), 'Extracto Octubre.XLSX')
  assert.equal(uploadName('movimientos', 'text/csv'), 'movimientos.csv')
  assert.equal(uploadName('movimientos', 'text/comma-separated-values'), 'movimientos.csv')
  assert.equal(uploadName('movimientos', XLSX), 'movimientos.xlsx')
  assert.equal(uploadName('', XLSX), 'extracto.xlsx')
  assert.equal(uploadName(null, null), 'extracto')
  assert.equal(uploadName('foto.jpg', 'image/jpeg'), 'foto.jpg')
})

test('validateFile acepta CSV/Excel hasta 10 MB y rechaza el resto con un mensaje claro', () => {
  assert.equal(validateFile({ name: 'a.csv', size: 1200 }), null)
  assert.equal(validateFile({ name: 'a.xlsx', size: null }), null)
  assert.match(validateFile({ name: 'extracto.pdf', size: 10 })!, /\.csv o \.xlsx/)
  assert.match(validateFile({ name: 'viejo.xls', size: 10 })!, /\.csv o \.xlsx/)
  assert.match(validateFile({ name: 'a.csv', size: MAX_BYTES + 1 })!, /10 MB/)
})

test('fileFromPicker y fileFromShare arman el archivo a subir', () => {
  assert.deepEqual(fileFromPicker({ uri: 'file:///cache/x', name: 'x', mimeType: 'text/csv', size: 50 }), {
    uri: 'file:///cache/x',
    name: 'x.csv',
    mimeType: 'text/csv',
    size: 50,
    blob: undefined,
  })
  assert.deepEqual(fileFromShare({ path: 'file:///data/e.xlsx', fileName: 'e.xlsx', mimeType: XLSX, size: null }), {
    uri: 'file:///data/e.xlsx',
    name: 'e.xlsx',
    mimeType: XLSX,
    size: null,
  })
})

test('los parámetros de ruta van y vuelven sin perder datos', () => {
  const file: UploadFile = { uri: 'content://downloads/12', name: 'extracto.csv', mimeType: 'text/csv', size: 2048 }
  const params = toRouteParams(file)
  assert.deepEqual(params, { uri: 'content://downloads/12', name: 'extracto.csv', mimeType: 'text/csv', size: '2048' })
  assert.deepEqual(fromRouteParams(params), file)
  assert.equal(fromRouteParams({}), null)
  assert.deepEqual(fromRouteParams({ uri: ['u1', 'u2'], name: 'a', size: 'x' }), { uri: 'u1', name: 'a', mimeType: null, size: null })
})

// ---------- Columnas ----------

test('initialMapping usa las sugerencias de la API y validateMapping exige tres columnas distintas', () => {
  const mapping = initialMapping(inspect())
  assert.deepEqual(mapping, { date: 'FECHA', amount: 'VALOR', description: 'DESCRIPCIÓN' })
  assert.equal(validateMapping(mapping), null)
  assert.match(validateMapping({ ...mapping, amount: '' })!, /Elige una columna/)
  assert.match(validateMapping({ ...mapping, amount: 'FECHA' })!, /columna distinta/)
  assert.equal(initialMapping(inspect({ suggestedAmountColumn: null })).amount, '')
})

test('roleOf etiqueta las columnas elegidas', () => {
  const mapping = initialMapping(inspect())
  assert.equal(roleOf(mapping, 'FECHA'), 'Fecha')
  assert.equal(roleOf(mapping, 'VALOR'), 'Monto')
  assert.equal(roleOf(mapping, 'DESCRIPCIÓN'), 'Descripción')
  assert.equal(roleOf(mapping, 'SUCURSAL'), null)
})

test('foreignCurrency solo marca monedas distintas de COP', () => {
  assert.equal(foreignCurrency(inspect()), null)
  assert.equal(foreignCurrency(inspect({ detectedCurrency: 'COP' })), null)
  assert.equal(foreignCurrency(inspect({ detectedCurrency: 'USD' })), 'USD')
})

// ---------- Revisión ----------

const rows = [
  row(2),
  row(3, { isDuplicate: true }),
  row(4, { error: 'Fecha inválida', date: null }),
  row(5, { amount: 1_500_000, description: '  ' }),
]

test('por defecto se marcan las válidas que no parecen duplicadas', () => {
  assert.deepEqual(
    importableRows(rows).map((r) => r.rowNumber),
    [2, 3, 5],
  )
  assert.deepEqual([...defaultSelection(rows)], [2, 5])
  assert.deepEqual([...toggleRow(new Set([2]), 3)].sort(), [2, 3])
  assert.deepEqual([...toggleRow(new Set([2, 3]), 3)], [2])
})

test('buildConfirmRows manda solo las elegidas y válidas, con fecha corta y categoría opcional', () => {
  const selected = new Set([2, 4, 5]) // la 4 tiene error: se ignora aunque esté marcada
  assert.deepEqual(buildConfirmRows(rows, selected, null), [
    { date: '2026-10-05', amount: -38900, description: 'Compra Éxito', categoryId: null },
    { date: '2026-10-05', amount: 1_500_000, description: 'Movimiento importado', categoryId: null },
  ])
  assert.equal(buildConfirmRows(rows, new Set([2]), 'cat-1')[0].categoryId, 'cat-1')
})

// ---------- API ----------

interface Call {
  url: string
  method: string
  body: unknown
}
let calls: Call[]

beforeEach(async () => {
  calls = []
  configureClient({
    baseUrl: 'https://api.test',
    tokenStore: memoryTokenStore('refresh-0'),
    fetch: async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })
  await setSession({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    accessTokenExpiresAt: '2026-11-09T00:15:00Z',
    user: { id: 'u1', email: 'ana@test.co', name: 'Ana', preferredCurrency: 'COP' },
  })
})

const csv: UploadFile = { uri: 'file:///x.csv', name: 'extracto.csv', mimeType: 'text/csv', size: 9, blob: new Blob(['FECHA;VALOR']) }

test('inspect sube el archivo como multipart y pasa la hoja en la query', async () => {
  await inspectImport(csv)
  await inspectImport(csv, 'PESOS')
  assert.equal(calls[0].url, 'https://api.test/api/transactions/import/inspect')
  assert.equal(calls[0].method, 'POST')
  assert.ok(calls[0].body instanceof FormData)
  const sent = (calls[0].body as FormData).get('file') as File
  assert.equal(sent.name, 'extracto.csv')
  assert.equal(calls[1].url, 'https://api.test/api/transactions/import/inspect?sheet=PESOS')
})

test('preview manda columnas, signo y hoja', async () => {
  await previewImport(csv, { date: 'FECHA', amount: 'VALOR', description: 'DESCRIPCIÓN' }, { sheet: 'PESOS', invertSign: true })
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/api/transactions/import/preview')
  assert.equal(url.searchParams.get('dateColumn'), 'FECHA')
  assert.equal(url.searchParams.get('amountColumn'), 'VALOR')
  assert.equal(url.searchParams.get('descriptionColumn'), 'DESCRIPCIÓN')
  assert.equal(url.searchParams.get('invertSign'), 'true')
  assert.equal(url.searchParams.get('sheet'), 'PESOS')
})

test('confirm manda las filas en JSON', async () => {
  const confirmRows = [{ date: '2026-10-05', amount: -38900, description: 'Compra', categoryId: null }]
  await confirmImport(confirmRows)
  assert.equal(calls[0].url, 'https://api.test/api/transactions/import/confirm')
  assert.deepEqual(JSON.parse(calls[0].body as string), { accountId: null, rows: confirmRows })
})

test('en el teléfono la parte del archivo es { uri, name, type } (la que sube XMLHttpRequest)', () => {
  const part = filePart({ uri: 'content://com.android.providers/12', name: 'extracto.xlsx', mimeType: XLSX, size: 5 })
  assert.deepEqual(part, { uri: 'content://com.android.providers/12', name: 'extracto.xlsx', type: XLSX })
  // Sin MIME conocido se manda genérico
  assert.deepEqual(filePart({ uri: 'file:///x.csv', name: 'x.csv', mimeType: null, size: null }), {
    uri: 'file:///x.csv',
    name: 'x.csv',
    type: 'application/octet-stream',
  })
})

test('las subidas usan el transporte de archivos (uploadFetch); el resto, el fetch normal', async () => {
  const uploads: string[] = []
  configureClient({
    uploadFetch: async (url) => {
      uploads.push(url)
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })
  try {
    await inspectImport(csv)
    await confirmImport([])
    assert.deepEqual(uploads, ['https://api.test/api/transactions/import/inspect'])
    assert.deepEqual(
      calls.map((c) => c.url),
      ['https://api.test/api/transactions/import/confirm'],
    )
  } finally {
    configureClient({ uploadFetch: null })
  }
})
