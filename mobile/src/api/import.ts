import { api } from './client'
import type { ImportConfirmResponse, ImportConfirmRow, ImportInspectResponse, ImportPreviewResponse } from './types'

// Mismos endpoints que web/src/api/import.ts. Diferencia: en el teléfono no hay `File`, el archivo
// es una URI local (selector de archivos o "Compartir con Tino").

/** Archivo a subir. */
export interface UploadFile {
  /** file:// o content:// (Android). */
  uri: string
  /** Con extensión: la API elige el lector (.csv / .xlsx) por ella. */
  name: string
  mimeType: string | null
  /** Bytes, si se conocen. */
  size: number | null
  /** Solo en el navegador (react-native-web) y en los tests: el contenido real. */
  blob?: Blob
}

/** Lee el contenido de una URI local (en la app: expo-file-system, ver api/index.ts). */
export type FileBytesReader = (uri: string) => Promise<Uint8Array>

let readFileBytes: FileBytesReader = async () => {
  throw new Error('No hay lector de archivos configurado')
}

export function configureFileReader(reader: FileBytesReader) {
  readFileBytes = reader
}

/**
 * Parte "file" del multipart. OJO: desde SDK 58 el `fetch` global es `expo/fetch`, que NO acepta el
 * clásico `{ uri, name, type }` de React Native ("Unsupported FormDataPart implementation"); sí
 * acepta cualquier objeto con `bytes()`, y toma `name` y `type` para los encabezados de la parte.
 * El nombre importa: la API elige el lector (.csv / .xlsx) por la extensión.
 */
export interface BytesPart {
  name: string
  type: string
  bytes: () => Promise<Uint8Array>
}

export function filePart(file: UploadFile): Blob | BytesPart {
  if (file.blob) return file.blob
  return { name: file.name, type: file.mimeType ?? 'application/octet-stream', bytes: () => readFileBytes(file.uri) }
}

function fileForm(file: UploadFile): FormData {
  const form = new FormData()
  const part = filePart(file)
  if (part instanceof Blob) form.append('file', part, file.name)
  else form.append('file', part as unknown as Blob) // expo/fetch lo serializa con bytes()
  return form
}

/** Paso 1: columnas, filas de muestra y mapeo sugerido (de la hoja indicada, o la primera). */
export function inspectImport(file: UploadFile, sheet?: string | null) {
  const query = sheet ? `?${new URLSearchParams({ sheet })}` : ''
  return api<ImportInspectResponse>(`/api/transactions/import/inspect${query}`, { method: 'POST', form: fileForm(file) })
}

export interface ImportColumns {
  date: string
  amount: string
  description: string
}

export interface PreviewOptions {
  sheet?: string | null
  /** Tarjetas de crédito: el servidor invierte el signo antes de buscar duplicados. */
  invertSign: boolean
}

/** Paso 2: interpreta todas las filas con el mapeo elegido (no guarda nada). */
export function previewImport(file: UploadFile, columns: ImportColumns, options: PreviewOptions) {
  const params = new URLSearchParams({
    dateColumn: columns.date,
    amountColumn: columns.amount,
    descriptionColumn: columns.description,
    invertSign: String(options.invertSign),
  })
  if (options.sheet) params.set('sheet', options.sheet)
  return api<ImportPreviewResponse>(`/api/transactions/import/preview?${params}`, { method: 'POST', form: fileForm(file) })
}

/** Paso 3: guarda las filas que el usuario confirmó. */
export function confirmImport(rows: ImportConfirmRow[], accountId?: string) {
  return api<ImportConfirmResponse>('/api/transactions/import/confirm', { method: 'POST', json: { accountId: accountId ?? null, rows } })
}
