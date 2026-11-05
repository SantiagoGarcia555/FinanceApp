import { api } from './client'
import type { CategoryResponse } from './types'

/** includeHidden: también las del sistema que el usuario ocultó (para poder volver a mostrarlas). */
export function listAllCategories(signal?: AbortSignal) {
  return api<CategoryResponse[]>('/api/categories?includeHidden=true', { signal })
}

export function createCategory(request: { name: string; icon: string | null }) {
  return api<CategoryResponse>('/api/categories', { method: 'POST', json: request })
}

/** Solo categorías propias (las del sistema no se editan). */
export function updateCategory(id: string, request: { name: string; icon: string | null }) {
  return api<CategoryResponse>(`/api/categories/${id}`, { method: 'PUT', json: request })
}

/**
 * Propia → se elimina (sus movimientos quedan sin categoría y su presupuesto se borra).
 * Del sistema → solo se oculta para este usuario (US-08).
 */
export function deleteOrHideCategory(id: string) {
  return api<void>(`/api/categories/${id}`, { method: 'DELETE' })
}

export function unhideCategory(id: string) {
  return api<void>(`/api/categories/${id}/unhide`, { method: 'POST' })
}
