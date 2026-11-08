/*
 * Alta rápida (1.3.3): validación, armado del request y atajos de mobile/src/features/transactions/transactionForm.ts.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CategoryResponse, TransactionResponse } from '../src/api/types'
import {
  buildRequest,
  categoriesFor,
  defaultIncomeCategory,
  initialValues,
  quickDates,
  sanitizeDigits,
  type FormValues,
} from '../src/features/transactions/transactionForm'

const cat = (id: string, name: string, icon: string | null): CategoryResponse => ({ id, name, icon, isSystemDefined: true, isHidden: false })
const categories = [cat('food', 'Alimentación', 'food'), cat('inc', 'Ingresos', 'income'), cat('mine', 'Freelance', null)]

const values = (patch: Partial<FormValues> = {}): FormValues => ({
  kind: 'expense',
  digits: '38900',
  description: '',
  categoryId: 'food',
  date: '2026-11-06',
  ...patch,
})

const editing: TransactionResponse = {
  id: 't1',
  accountId: 'acc',
  accountName: 'Principal',
  categoryId: 'hidden-cat',
  categoryName: 'Vieja',
  amount: 250000,
  currency: 'COP',
  description: 'Venta bici',
  date: '2026-10-30T00:00:00',
  source: 'manual',
  createdAt: '2026-10-30T10:00:00Z',
}

test('el monto solo acepta dígitos, sin ceros a la izquierda y con tope', () => {
  assert.equal(sanitizeDigits('$ 38.900'), '38900')
  assert.equal(sanitizeDigits('000120'), '120')
  assert.equal(sanitizeDigits('1234567890123456'), '123456789012')
  assert.equal(sanitizeDigits(''), '')
})

test('atajos Hoy/Ayer, también al cambiar de mes', () => {
  assert.deepEqual(quickDates(new Date(2026, 10, 1, 9)), { today: '2026-11-01', yesterday: '2026-10-31' })
})

test('categorías por tipo: un gasto no ofrece "Ingresos"; un ingreso la pone primero', () => {
  assert.deepEqual(categoriesFor('expense', categories).map((c) => c.id), ['food', 'mine'])
  assert.deepEqual(categoriesFor('income', categories).map((c) => c.id), ['inc', 'food', 'mine'])
  assert.equal(defaultIncomeCategory(categories), 'inc')
  assert.equal(defaultIncomeCategory([categories[0]]), null)
})

test('gasto rápido: monto + categoría → request con signo negativo y descripción = categoría', () => {
  const result = buildRequest(values(), categories, null)
  assert.ok(result.ok)
  assert.deepEqual(result.request, {
    accountId: undefined,
    categoryId: 'food',
    amount: -38900,
    currency: 'COP',
    description: 'Alimentación',
    date: '2026-11-06',
  })
})

test('ingreso con descripción propia (recortada)', () => {
  const result = buildRequest(values({ kind: 'income', categoryId: 'inc', digits: '5200000', description: '  Nómina  ' }), categories, null)
  assert.ok(result.ok)
  assert.equal(result.request.amount, 5200000)
  assert.equal(result.request.description, 'Nómina')
})

test('errores: monto cero, sin categoría (US-04) y fecha inválida', () => {
  const result = buildRequest(values({ digits: '', categoryId: null, date: '' }), categories, null)
  assert.ok(!result.ok)
  assert.deepEqual(Object.keys(result.errors).sort(), ['amount', 'category', 'date'])
  // Una categoría que no está en la lista (p. ej. oculta) no vale para un alta nueva
  assert.ok(!buildRequest(values({ categoryId: 'hidden-cat' }), categories, null).ok)
})

test('editar: conserva cuenta, moneda y una categoría que ya no está visible', () => {
  const initial = initialValues(editing)
  assert.deepEqual(initial, { kind: 'income', digits: '250000', description: 'Venta bici', categoryId: 'hidden-cat', date: '2026-10-30' })
  const result = buildRequest({ ...initial, digits: '260000' }, categories, editing)
  assert.ok(result.ok)
  assert.equal(result.request.accountId, 'acc')
  assert.equal(result.request.categoryId, 'hidden-cat')
  assert.equal(result.request.amount, 260000)
  // Si borra la descripción al editar, se mantiene la anterior antes que inventar una
  const cleared = buildRequest({ ...initial, description: '' }, categories, editing)
  assert.ok(cleared.ok)
  assert.equal(cleared.request.description, 'Venta bici')
})

test('alta nueva arranca como gasto de hoy', () => {
  assert.deepEqual(initialValues(null, new Date(2026, 10, 6)), { kind: 'expense', digits: '', description: '', categoryId: null, date: '2026-11-06' })
})
