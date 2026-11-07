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

/** Mismo contrato que web/src/features/dashboard/dashboardData.ts. */
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
 * Carga todo lo que necesita el dashboard en paralelo (5 peticiones; el refresh del token es
 * single-flight, así que si expiró se renueva una sola vez para todas).
 * Sin imports de React Native: se prueba con Node (tests/dashboard.test.mts).
 */
export async function loadDashboard(signal?: AbortSignal, now = new Date()): Promise<DashboardData> {
  const month = currentMonth(now)
  const [summary, trend, transactions, categories, budgets] = await Promise.all([
    api<MonthlySummaryResponse>(`/api/dashboard/summary?month=${month}`, { signal }),
    api<TrendResponse>('/api/dashboard/trend?months=6', { signal }),
    api<PagedResult<TransactionResponse>>('/api/transactions?page=1&pageSize=5', { signal }),
    api<CategoryResponse[]>('/api/categories', { signal }),
    api<BudgetResponse[]>(`/api/budgets?month=${month}`, { signal }),
  ])

  return {
    summary,
    trend: trend.months,
    recentTransactions: transactions.items,
    categoryIcons: Object.fromEntries(categories.map((c) => [c.id, c.icon])),
    budgets,
  }
}
