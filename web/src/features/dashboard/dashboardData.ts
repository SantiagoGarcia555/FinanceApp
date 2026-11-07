import { listBudgets } from '../../api/budgets'
import { api } from '../../api/client'
import type {
  BudgetResponse,
  CategoryResponse,
  MonthlySummaryResponse,
  MonthlyTrendPoint,
  PagedResult,
  TransactionResponse,
  TrendResponse,
} from '../../api/types'
import { currentMonth } from '../../../../shared/dashboard'

export interface DashboardData {
  /** GET api/dashboard/summary?month=yyyy-MM */
  summary: MonthlySummaryResponse
  /** Últimos 6 meses, del más antiguo al actual. */
  trend: MonthlyTrendPoint[]
  /** GET api/transactions (las más recientes; la API ordena por fecha descendente). */
  recentTransactions: TransactionResponse[]
  /** categoryId → clave de ícono (GET api/categories). */
  categoryIcons: Record<string, string | null>
  /** GET api/budgets?month=… (ordenados por % usado, de mayor a menor). */
  budgets: BudgetResponse[]
}

/**
 * Carga todo lo que necesita el dashboard en paralelo.
 * Los insights de IA llegan en la fase 2 (ISavingsInsightService); mientras tanto el dashboard
 * los deriva de presupuestos y gastos reales del mes (shared/dashboard.ts).
 */
export async function loadDashboard(signal?: AbortSignal): Promise<DashboardData> {
  const month = currentMonth()
  const [summary, trend, transactions, categories, budgets] = await Promise.all([
    api<MonthlySummaryResponse>(`/api/dashboard/summary?month=${month}`, { signal }),
    api<TrendResponse>('/api/dashboard/trend?months=6', { signal }),
    api<PagedResult<TransactionResponse>>('/api/transactions?page=1&pageSize=5', { signal }),
    api<CategoryResponse[]>('/api/categories', { signal }),
    listBudgets(month, signal),
  ])

  return {
    summary,
    trend: trend.months,
    recentTransactions: transactions.items,
    categoryIcons: Object.fromEntries(categories.map((c) => [c.id, c.icon])),
    budgets,
  }
}
