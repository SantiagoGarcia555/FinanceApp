import { api } from './client'
import type { BudgetPeriod, BudgetResponse } from './types'

/** month: yyyy-MM (por defecto el mes actual en el servidor). */
export function listBudgets(month?: string, signal?: AbortSignal) {
  return api<BudgetResponse[]>(`/api/budgets${month ? `?month=${month}` : ''}`, { signal })
}

export function createBudget(request: { categoryId: string; limitAmount: number; period: BudgetPeriod }) {
  return api<BudgetResponse>('/api/budgets', { method: 'POST', json: request })
}

export function updateBudget(id: string, request: { limitAmount: number; period: BudgetPeriod }) {
  return api<BudgetResponse>(`/api/budgets/${id}`, { method: 'PUT', json: request })
}

export function deleteBudget(id: string) {
  return api<void>(`/api/budgets/${id}`, { method: 'DELETE' })
}

// Color como dato (bosque/sol/terracota): lógica común con la app móvil
export { budgetTone } from '../../../shared/dashboard'
