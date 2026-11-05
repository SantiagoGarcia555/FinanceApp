import { api } from '../../api/client'
import type {
  CategoryResponse,
  MonthlySummaryResponse,
  MonthlyTrendPoint,
  PagedResult,
  TransactionResponse,
  TrendResponse,
} from '../../api/types'

export interface DashboardData {
  /** GET api/dashboard/summary?month=yyyy-MM */
  summary: MonthlySummaryResponse
  /** Mes anterior (de api/dashboard/trend). null si no tuvo movimientos. */
  previousMonth: MonthlyTrendPoint | null
  /** GET api/transactions (las más recientes; la API ordena por fecha descendente). */
  recentTransactions: TransactionResponse[]
  /** categoryId → clave de ícono (GET api/categories). */
  categoryIcons: Record<string, string | null>
}

const pad = (n: number) => String(n).padStart(2, '0')

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

/**
 * Carga todo lo que necesita el dashboard en paralelo.
 * Pendientes de backend: presupuestos (Budget no tiene controlador) e insights de IA (fase 2);
 * mientras tanto el dashboard deriva esos bloques de los datos reales del mes.
 */
export async function loadDashboard(signal?: AbortSignal): Promise<DashboardData> {
  const [summary, trend, transactions, categories] = await Promise.all([
    api<MonthlySummaryResponse>(`/api/dashboard/summary?month=${currentMonth()}`, { signal }),
    api<TrendResponse>('/api/dashboard/trend?months=2', { signal }),
    api<PagedResult<TransactionResponse>>('/api/transactions?page=1&pageSize=5', { signal }),
    api<CategoryResponse[]>('/api/categories', { signal }),
  ])

  const prev = trend.months.length >= 2 ? trend.months[trend.months.length - 2] : null

  return {
    summary,
    previousMonth: prev && (prev.totalIncome !== 0 || prev.totalExpense !== 0) ? prev : null,
    recentTransactions: transactions.items,
    categoryIcons: Object.fromEntries(categories.map((c) => [c.id, c.icon])),
  }
}
