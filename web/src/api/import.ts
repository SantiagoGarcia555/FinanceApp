import { api } from './client'
import type { ImportConfirmResponse, ImportConfirmRow, ImportInspectResponse, ImportPreviewResponse } from './types'

function fileForm(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

/** Paso 1: columnas, filas de muestra y mapeo sugerido (de la hoja indicada, o la primera). */
export function inspectImport(file: File, sheet?: string | null) {
  const query = sheet ? `?${new URLSearchParams({ sheet })}` : ''
  return api<ImportInspectResponse>(`/api/transactions/import/inspect${query}`, { method: 'POST', form: fileForm(file) })
}

export interface PreviewOptions {
  sheet?: string | null
  /** Tarjetas de crédito: el servidor invierte el signo antes de buscar duplicados. */
  invertSign: boolean
}

/** Paso 2: interpreta todas las filas con el mapeo elegido (no guarda nada). */
export function previewImport(file: File, columns: { date: string; amount: string; description: string }, options: PreviewOptions) {
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
