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

/** Parte "file" en el teléfono: el clásico objeto de React Native que XMLHttpRequest sabe subir. */
export interface UriPart {
  uri: string
  name: string
  type: string
}

/**
 * Parte "file" del multipart. En el teléfono va como `{ uri, name, type }` y se sube con xhrFetch
 * (configurado en api/index.ts): `expo/fetch`, el fetch global desde SDK 58, NO acepta esta forma.
 * El nombre importa: la API elige el lector (.csv / .xlsx) por la extensión.
 */
export function filePart(file: UploadFile): Blob | UriPart {
  if (file.blob) return file.blob
  return { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' }
}

function fileForm(file: UploadFile): FormData {
  const form = new FormData()
  const part = filePart(file)
  if (part instanceof Blob) form.append('file', part, file.name)
  else form.append('file', part as unknown as Blob)
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
