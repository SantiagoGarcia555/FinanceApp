import { api } from './client'
import type { CategoryResponse, PagedResult, TransactionRequest, TransactionResponse } from './types'

// Mismos endpoints que web/src/api/transactions.ts

export interface TransactionFilters {
  /** yyyy-MM-dd (inclusive) */
  from?: string
  /** yyyy-MM-dd (inclusive) */
  to?: string
  categoryId?: string
  type?: 'income' | 'expense'
  page?: number
  pageSize?: number
}

/** GET api/transactions (fecha descendente, paginado). */
export function listTransactions(filters: TransactionFilters, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return api<PagedResult<TransactionResponse>>(`/api/transactions?${params}`, { signal })
}

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
