import type { UploadFile } from '../../api/import'
import type { ImportConfirmRow, ImportInspectResponse, ImportRowPreview } from '../../api/types'

/**
 * Reglas del importador móvil (1.3.5), sin React Native: se prueban con Node (tests/import.test.mts).
 * Mismo flujo que web/src/features/import/ImportPage.tsx: archivo → columnas → revisar → listo.
 */

export const MAX_BYTES = 10_000_000 // igual que [RequestSizeLimit] en la API

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const EXTENSION_BY_MIME: Record<string, string> = {
  'text/csv': '.csv',
  'text/comma-separated-values': '.csv',
  'application/csv': '.csv',
  // Android etiqueta muchos CSV como Excel 97; el .xls binario no lo leemos de todos modos.
  'application/vnd.ms-excel': '.csv',
  [XLSX_MIME]: '.xlsx',
}

const ACCEPTED = /\.(csv|xlsx)$/i

/**
 * Nombre con extensión para la API. Algunas apps comparten "extracto" o "document" sin extensión:
 * se deduce del MIME. Sin nombre ni MIME reconocible queda tal cual y la validación lo rechaza.
 */
export function uploadName(name: string | null | undefined, mimeType: string | null | undefined): string {
  const base = name?.trim() || 'extracto'
  if (ACCEPTED.test(base)) return base
  const ext = mimeType ? EXTENSION_BY_MIME[mimeType.toLowerCase()] : undefined
  return ext ? `${base}${ext}` : base
}

/** Archivo elegido con expo-document-picker (subset de DocumentPickerAsset). */
export interface PickedAsset {
  uri: string
  name: string
  mimeType?: string | null
  size?: number | null
  file?: Blob
}

export function fileFromPicker(asset: PickedAsset): UploadFile {
  return {
    uri: asset.uri,
    name: uploadName(asset.name, asset.mimeType),
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? null,
    blob: asset.file,
  }
}

/** Archivo recibido con expo-share-intent (subset de ShareIntentFile). */
export interface SharedFile {
  path: string
  fileName: string | null
  mimeType: string | null
  size: number | null
}

export function fileFromShare(file: SharedFile): UploadFile {
  return { uri: file.path, name: uploadName(file.fileName, file.mimeType), mimeType: file.mimeType, size: file.size }
}

/** Parámetros de la ruta /importar (Expo Router solo pasa strings). */
export type ImportRouteParams = { uri: string; name: string; mimeType?: string; size?: string }

export function toRouteParams(file: UploadFile): ImportRouteParams {
  return {
    uri: file.uri,
    name: file.name,
    ...(file.mimeType && { mimeType: file.mimeType }),
    ...(file.size != null && { size: String(file.size) }),
  }
}

export function fromRouteParams(params: Partial<Record<keyof ImportRouteParams, string | string[]>>): UploadFile | null {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const uri = one(params.uri)
  if (!uri) return null
  const mimeType = one(params.mimeType) ?? null
  const size = Number(one(params.size))
  return { uri, name: uploadName(one(params.name), mimeType), mimeType, size: Number.isFinite(size) && size > 0 ? size : null }
}

/** Mensaje de error si el archivo no se puede importar; null si está bien. */
export function validateFile(file: Pick<UploadFile, 'name' | 'size'>): string | null {
  if (!ACCEPTED.test(file.name)) return 'Ese formato no lo leemos todavía. Usa un archivo .csv o .xlsx.'
  if (file.size != null && file.size > MAX_BYTES) return 'El archivo pesa más de 10 MB. Exporta un rango de fechas más corto.'
  return null
}

// ---------- Paso 2: columnas ----------

export type Mapping = { date: string; amount: string; description: string }

export function initialMapping(inspect: ImportInspectResponse): Mapping {
  return {
    date: inspect.suggestedDateColumn ?? '',
    amount: inspect.suggestedAmountColumn ?? '',
    description: inspect.suggestedDescriptionColumn ?? '',
  }
}

export function validateMapping(mapping: Mapping): string | null {
  const values = [mapping.date, mapping.amount, mapping.description]
  if (values.some((v) => !v)) return 'Elige una columna para fecha, monto y descripción.'
  if (new Set(values).size !== 3) return 'Cada dato debe venir de una columna distinta.'
  return null
}

export type ColumnRole = 'Fecha' | 'Monto' | 'Descripción'

export function roleOf(mapping: Mapping, header: string): ColumnRole | null {
  if (header === mapping.date) return 'Fecha'
  if (header === mapping.amount) return 'Monto'
  if (header === mapping.description) return 'Descripción'
  return null
}

/** La API rechaza otras monedas (el dashboard suma todo como pesos): devuelve la moneda extranjera o null. */
export function foreignCurrency(inspect: ImportInspectResponse): string | null {
  return inspect.detectedCurrency && inspect.detectedCurrency !== 'COP' ? inspect.detectedCurrency : null
}

// ---------- Paso 3: revisar ----------

export function importableRows(rows: ImportRowPreview[]): ImportRowPreview[] {
  return rows.filter((r) => !r.error && r.date != null && r.amount != null)
}

/** Por defecto: todas las válidas que no parecen duplicadas. */
export function defaultSelection(rows: ImportRowPreview[]): Set<number> {
  return new Set(
    importableRows(rows)
      .filter((r) => !r.isDuplicate)
      .map((r) => r.rowNumber),
  )
}

export function toggleRow(selected: Set<number>, rowNumber: number): Set<number> {
  const next = new Set(selected)
  if (next.has(rowNumber)) next.delete(rowNumber)
  else next.add(rowNumber)
  return next
}

/** Filas a enviar a import/confirm. Sin descripción en el extracto, se usa "Movimiento importado". */
export function buildConfirmRows(rows: ImportRowPreview[], selected: Set<number>, categoryId: string | null): ImportConfirmRow[] {
  return importableRows(rows)
    .filter((r) => selected.has(r.rowNumber))
    .map((r) => ({
      date: r.date!.slice(0, 10),
      amount: r.amount!,
      description: r.description?.trim() || 'Movimiento importado',
      categoryId: categoryId || null,
    }))
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
