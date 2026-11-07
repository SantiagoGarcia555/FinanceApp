// Lógica del dashboard (US-12) común a web y móvil: qué mostrar a partir de los datos de la API.
// Sin React ni DOM: cada app pone la presentación y la navegación.
import type { BudgetResponse, CategorySummary, MonthlySummaryResponse, MonthlyTrendPoint } from './api-types'
import { formatMoney } from './format'

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → "2026-11" (mes local). */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

/** "2026-11" → "nov" (offset en meses: -1 = mes anterior). */
export function monthShort(month: string, offset = 0): string {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(y, m - 1 + offset, 1)).replace('.', '')
}

/** Color como dato: bosque = en orden, sol = cerca del límite, terracota = excedido. */
export function budgetTone(percentUsed: number): 'brand' | 'progress' | 'accent' {
  if (percentUsed >= 100) return 'accent'
  if (percentUsed >= 80) return 'progress'
  return 'brand'
}

export interface DashboardInput {
  summary: MonthlySummaryResponse
  /** Del más antiguo al mes actual (GET api/dashboard/trend). */
  trend: MonthlyTrendPoint[]
  /** GET api/budgets?month=… (la API los ordena por % usado, de mayor a menor). */
  budgets: BudgetResponse[]
  /** Cuántos movimientos recientes hay (para decidir si la cuenta está vacía). */
  recentCount: number
}

/** Sugerencia derivada de datos reales hasta que llegue ISavingsInsightService (fase 2). */
export interface DashboardInsight {
  kind: 'over-budget' | 'near-budget' | 'top-category'
  message: string
  /** A dónde lleva la acción principal; cada app decide la ruta. */
  target: 'budgets' | 'transactions'
}

export interface BreakdownItem {
  categoryId: string | null
  categoryName: string
  icon: string | null
  total: number
  /** 0–100: peso sobre el gasto del mes. */
  share: number
}

export interface DashboardView {
  hasActivity: boolean
  /** Gasto del mes en positivo. */
  spent: number
  negativeBalance: boolean
  /** % de cambio del gasto vs el mes anterior; null si el anterior no tuvo gastos. */
  expenseChange: number | null
  /** "oct" */
  previousMonthLabel: string
  /** Hay al menos 2 meses con movimientos en la tendencia. */
  hasTrend: boolean
  monthlyBudgets: BudgetResponse[]
  /** % del total de presupuestos mensuales usado. */
  budgetPercent: number
  insight: DashboardInsight | null
  breakdown: BreakdownItem[]
}

const BREAKDOWN_ITEMS = 5

/** Top 5 categorías de gasto + "Otras", con su peso sobre el total. */
export function categoryBreakdown(categories: CategorySummary[]): BreakdownItem[] {
  const total = categories.reduce((acc, c) => acc + c.total, 0)
  if (total <= 0) return []
  const top = categories.slice(0, BREAKDOWN_ITEMS)
  const rest = categories.slice(BREAKDOWN_ITEMS).reduce((acc, c) => acc + c.total, 0)
  const items = rest > 0 ? [...top, { categoryId: null, categoryName: 'Otras', icon: 'other', total: rest }] : top
  return items.map((c) => ({ categoryId: c.categoryId, categoryName: c.categoryName, icon: c.icon, total: c.total, share: (c.total / total) * 100 }))
}

const hasMovements = (m: { totalIncome: number; totalExpense: number }) => m.totalIncome !== 0 || m.totalExpense !== 0

export function buildDashboardView({ summary, trend, budgets, recentCount }: DashboardInput): DashboardView {
  const spent = Math.abs(summary.totalExpense)

  // US-12: comparación simple del GASTO total con el mes anterior
  const prev = trend.length >= 2 ? trend[trend.length - 2] : null
  const prevSpent = prev && hasMovements(prev) ? Math.abs(prev.totalExpense) : 0
  const expenseChange = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null

  const monthlyBudgets = budgets.filter((b) => b.period === 'monthly')
  const budgetLimit = monthlyBudgets.reduce((acc, b) => acc + b.limitAmount, 0)
  const budgetSpent = monthlyBudgets.reduce((acc, b) => acc + b.spent, 0)

  // Prioridad: presupuesto excedido > cerca del límite > categoría con más gasto
  const over = monthlyBudgets.find((b) => b.percentUsed >= 100)
  const near = monthlyBudgets.find((b) => b.percentUsed >= 80 && b.percentUsed < 100)
  const top = summary.expensesByCategory[0]
  const topShare = top && spent > 0 ? Math.round((top.total / spent) * 100) : 0

  const insight: DashboardInsight | null = over
    ? {
        kind: 'over-budget',
        message: `Te pasaste ${formatMoney(-over.remaining)} en ${over.categoryName} este mes. Revisa esos gastos o ajusta el presupuesto.`,
        target: 'budgets',
      }
    : near
      ? {
          kind: 'near-budget',
          message: `Ya usaste el ${Math.round(near.percentUsed)}% de tu presupuesto de ${near.categoryName}. Te quedan ${formatMoney(near.remaining)} para el resto del mes.`,
          target: 'budgets',
        }
      : top && topShare > 0
        ? {
            kind: 'top-category',
            message: `Este mes, ${top.categoryName} se lleva el ${topShare}% de tus gastos (${formatMoney(top.total)}). Revisa si hay algo que puedas ajustar.`,
            target: 'transactions',
          }
        : null

  return {
    hasActivity: hasMovements(summary) || recentCount > 0,
    spent,
    negativeBalance: summary.balance < 0,
    expenseChange,
    previousMonthLabel: monthShort(summary.month, -1),
    hasTrend: trend.filter(hasMovements).length >= 2,
    monthlyBudgets,
    budgetPercent: budgetLimit ? (budgetSpent / budgetLimit) * 100 : 0,
    insight,
    breakdown: categoryBreakdown(summary.expensesByCategory),
  }
}
