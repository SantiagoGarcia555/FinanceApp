/*
 * Dashboard (1.3.2): reglas comunes web/móvil de shared/dashboard.ts y la carga en paralelo
 * de mobile/src/features/dashboard/dashboardData.ts con fetch simulado.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configureClient, memoryTokenStore } from '../src/api/client'
import { loadDashboard } from '../src/features/dashboard/dashboardData'
import type { BudgetResponse, CategorySummary, MonthlySummaryResponse, MonthlyTrendPoint } from '../src/api/types'
import { budgetTone, buildDashboardView, categoryBreakdown, currentMonth, monthShort } from '../../shared/dashboard'

const point = (month: string, totalIncome: number, totalExpense: number): MonthlyTrendPoint => ({
  month,
  totalIncome,
  totalExpense,
  balance: totalIncome + totalExpense,
})

const category = (name: string, total: number): CategorySummary => ({ categoryId: name, categoryName: name, icon: null, total })

const summary = (overrides: Partial<MonthlySummaryResponse> = {}): MonthlySummaryResponse => ({
  month: '2026-11',
  totalIncome: 5_000_000,
  totalExpense: -1_200_000,
  balance: 3_800_000,
  expensesByCategory: [category('Comida', 600_000), category('Transporte', 400_000), category('Hogar', 200_000)],
  ...overrides,
})

const budget = (categoryName: string, limitAmount: number, spent: number, period: 'monthly' | 'yearly' = 'monthly'): BudgetResponse => ({
  id: categoryName,
  categoryId: categoryName,
  categoryName,
  icon: null,
  limitAmount,
  period,
  spent,
  remaining: limitAmount - spent,
  percentUsed: (spent / limitAmount) * 100,
})

const view = (input: Partial<Parameters<typeof buildDashboardView>[0]> = {}) =>
  buildDashboardView({ summary: summary(), trend: [point('2026-10', 4_000_000, -1_000_000), point('2026-11', 5_000_000, -1_200_000)], budgets: [], recentCount: 3, ...input })

test('mes actual y abreviaturas (incluido el cambio de año)', () => {
  assert.equal(currentMonth(new Date(2026, 0, 15)), '2026-01')
  assert.equal(monthShort('2026-11'), 'nov')
  assert.equal(monthShort('2026-01', -1), 'dic')
})

test('comparación del gasto con el mes anterior', () => {
  const v = view()
  assert.ok(v.expenseChange !== null && Math.abs(v.expenseChange - 20) < 1e-9)
  assert.equal(v.previousMonthLabel, 'oct')
  // Mes anterior sin movimientos → sin comparación (no "∞% más")
  assert.equal(view({ trend: [point('2026-10', 0, 0), point('2026-11', 5_000_000, -1_200_000)] }).expenseChange, null)
  assert.equal(view({ trend: [point('2026-11', 5_000_000, -1_200_000)] }).expenseChange, null)
})

test('tendencia solo con 2+ meses con movimientos', () => {
  assert.equal(view().hasTrend, true)
  assert.equal(view({ trend: [point('2026-10', 0, 0), point('2026-11', 1, -1)] }).hasTrend, false)
})

test('cuenta vacía', () => {
  const v = view({ summary: summary({ totalIncome: 0, totalExpense: 0, balance: 0, expensesByCategory: [] }), recentCount: 0 })
  assert.equal(v.hasActivity, false)
  assert.equal(v.insight, null)
  assert.deepEqual(v.breakdown, [])
})

test('presupuestos: solo mensuales y % agregado', () => {
  const v = view({ budgets: [budget('Comida', 800_000, 600_000), budget('Hogar', 200_000, 100_000), budget('Viajes', 1_000_000, 0, 'yearly')] })
  assert.deepEqual(v.monthlyBudgets.map((b) => b.categoryName), ['Comida', 'Hogar'])
  assert.equal(v.budgetPercent, 70)
})

test('sugerencia: excedido > cerca del límite > mayor categoría', () => {
  const over = view({ budgets: [budget('Comida', 500_000, 600_000), budget('Hogar', 100_000, 90_000)] }).insight
  assert.equal(over?.kind, 'over-budget')
  assert.match(over?.message ?? '', /Te pasaste \$100\.000 en Comida/)
  assert.equal(over?.target, 'budgets')

  const near = view({ budgets: [budget('Hogar', 100_000, 90_000)] }).insight
  assert.equal(near?.kind, 'near-budget')
  assert.match(near?.message ?? '', /90% de tu presupuesto de Hogar\. Te quedan \$10\.000/)

  const top = view().insight
  assert.equal(top?.kind, 'top-category')
  assert.match(top?.message ?? '', /Comida se lleva el 50% de tus gastos \(\$600\.000\)/)
  assert.equal(top?.target, 'transactions')
})

test('reparto por categoría: top 5 + "Otras"', () => {
  const items = categoryBreakdown([100, 90, 80, 70, 60, 30, 20].map((total, i) => category(`C${i}`, total)))
  assert.deepEqual(items.map((c) => c.categoryName), ['C0', 'C1', 'C2', 'C3', 'C4', 'Otras'])
  assert.equal(items[5].total, 50)
  assert.equal(items[5].categoryId, null)
  assert.ok(Math.abs(items.reduce((acc, c) => acc + c.share, 0) - 100) < 1e-9)
  assert.deepEqual(categoryBreakdown([]), [])
})

test('tono del presupuesto', () => {
  assert.equal(budgetTone(79.9), 'brand')
  assert.equal(budgetTone(80), 'progress')
  assert.equal(budgetTone(100), 'accent')
})

test('loadDashboard pide los 5 recursos del mes y arma el índice de íconos', async () => {
  const urls: string[] = []
  const bodies: Record<string, unknown> = {
    '/api/dashboard/summary': summary(),
    '/api/dashboard/trend': { months: [point('2026-10', 1, -1), point('2026-11', 2, -2)] },
    '/api/transactions': { items: [{ id: 't1' }], page: 1, pageSize: 5, totalCount: 1 },
    '/api/categories': [{ id: 'c1', name: 'Comida', icon: 'food', isSystemDefined: true, isHidden: false }],
    '/api/budgets': [budget('Comida', 1, 1)],
  }
  configureClient({
    baseUrl: 'https://api.test',
    tokenStore: memoryTokenStore(),
    fetch: async (input) => {
      const url = new URL(String(input))
      urls.push(`${url.pathname}${url.search}`)
      return new Response(JSON.stringify(bodies[url.pathname]), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  const data = await loadDashboard(undefined, new Date(2026, 10, 6))

  assert.deepEqual(urls.sort(), [
    '/api/budgets?month=2026-11',
    '/api/categories',
    '/api/dashboard/summary?month=2026-11',
    '/api/dashboard/trend?months=6',
    '/api/transactions?page=1&pageSize=5',
  ])
  assert.equal(data.trend.length, 2)
  assert.equal(data.recentTransactions.length, 1)
  assert.deepEqual(data.categoryIcons, { c1: 'food' })
  assert.equal(data.budgets.length, 1)
})
