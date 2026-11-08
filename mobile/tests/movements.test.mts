/*
 * Listado de movimientos (1.3.4): filtros por mes, páginas sin duplicados y agrupación por día
 * de mobile/src/features/transactions/movements.ts.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TransactionResponse } from '../src/api/types'
import { addMonths, appendPage, firstOfMonth, groupByDay, monthFilters, PAGE_SIZE } from '../src/features/transactions/movements'

const tx = (id: string, date: string, amount: number): TransactionResponse => ({
  id,
  accountId: 'acc',
  accountName: null,
  categoryId: null,
  categoryName: null,
  amount,
  currency: 'COP',
  description: id,
  date: `${date}T00:00:00`,
  source: 'manual',
  createdAt: `${date}T12:00:00Z`,
})

test('filtros del mes: del 1 al último día, tipo y categoría opcionales', () => {
  assert.deepEqual(monthFilters(new Date(2026, 1, 14), 'all', ''), {
    from: '2026-02-01',
    to: '2026-02-28',
    type: undefined,
    categoryId: undefined,
    pageSize: PAGE_SIZE,
  })
  const f = monthFilters(new Date(2026, 10, 1), 'expense', 'food')
  assert.equal(f.to, '2026-11-30')
  assert.equal(f.type, 'expense')
  assert.equal(f.categoryId, 'food')
})

test('navegación de meses (cruza el año)', () => {
  assert.deepEqual(addMonths(new Date(2026, 0, 20), -1), new Date(2025, 11, 1))
  assert.deepEqual(firstOfMonth(new Date(2026, 10, 30, 18)), new Date(2026, 10, 1))
})

test('la página siguiente no repite movimientos ya cargados', () => {
  const merged = appendPage([tx('a', '2026-11-06', -1), tx('b', '2026-11-05', -2)], [tx('b', '2026-11-05', -2), tx('c', '2026-11-04', -3)])
  assert.deepEqual(merged.map((t) => t.id), ['a', 'b', 'c'])
})

test('agrupa por día en el orden de la API y suma el neto del día', () => {
  const sections = groupByDay([tx('a', '2026-11-06', -38900), tx('b', '2026-11-06', 100000), tx('c', '2026-11-04', -5000)])
  assert.deepEqual(
    sections.map((s) => [s.day, s.total, s.data.map((t) => t.id)]),
    [
      ['2026-11-06', 61100, ['a', 'b']],
      ['2026-11-04', -5000, ['c']],
    ],
  )
  assert.deepEqual(groupByDay([]), [])
})
