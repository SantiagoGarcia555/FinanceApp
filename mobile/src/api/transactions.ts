import { api } from './client'
import type { CategoryResponse, TransactionRequest, TransactionResponse } from './types'

// Mismos endpoints que web/src/api/transactions.ts

export function createTransaction(request: TransactionRequest) {
  return api<TransactionResponse>('/api/transactions', { method: 'POST', json: request })
}

export function updateTransaction(id: string, request: TransactionRequest) {
  return api<TransactionResponse>(`/api/transactions/${id}`, { method: 'PUT', json: request })
}

export function deleteTransaction(id: string) {
  return api<void>(`/api/transactions/${id}`, { method: 'DELETE' })
}

/** Categorías visibles del usuario (sistema + propias, sin las ocultas). */
export function listCategories(signal?: AbortSignal) {
  return api<CategoryResponse[]>('/api/categories', { signal })
}
