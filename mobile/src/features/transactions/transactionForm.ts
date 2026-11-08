import type { CategoryResponse, TransactionRequest, TransactionResponse } from '../../api/types'
import { toIsoDate } from '../../lib/format'

/**
 * Reglas del alta rápida (1.3.3), sin React Native: se prueban con Node (tests/transactionForm.test.mts).
 * Objetivo de UX: monto → categoría → Guardar. La descripción es opcional en el móvil: si se deja
 * vacía se usa el nombre de la categoría (la API la exige).
 */

export type Kind = 'expense' | 'income'

export const MAX_DIGITS = 12 // hasta 999.999.999.999

/** Clave de ícono de la categoría del sistema "Ingresos" (backend/Data/SeedCategories.cs). */
const INCOME_ICON = 'income'

/** Lo que escribe el usuario → solo dígitos, sin ceros a la izquierda ("38.900" → "38900"). */
export function sanitizeDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS)
}

/** Atajos de fecha: hoy y ayer (fecha local). */
export function quickDates(now = new Date()): { today: string; yesterday: string } {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  return { today: toIsoDate(now), yesterday: toIsoDate(yesterday) }
}

/**
 * Categorías a mostrar como chips: en un gasto se oculta "Ingresos"; en un ingreso va primero.
 * (Las propias del usuario no tienen tipo, así que se muestran en ambos.)
 */
export function categoriesFor(kind: Kind, categories: CategoryResponse[]): CategoryResponse[] {
  if (kind === 'expense') return categories.filter((c) => c.icon !== INCOME_ICON)
  return [...categories.filter((c) => c.icon === INCOME_ICON), ...categories.filter((c) => c.icon !== INCOME_ICON)]
}

/** Categoría sugerida al pasar a "Ingreso" sin categoría elegida. */
export function defaultIncomeCategory(categories: CategoryResponse[]): string | null {
  return categories.find((c) => c.icon === INCOME_ICON)?.id ?? null
}

export interface FormValues {
  kind: Kind
  digits: string
  description: string
  categoryId: string | null
  date: string
}

export type FormErrors = Partial<Record<'amount' | 'category' | 'date', string>>

export function initialValues(editing: TransactionResponse | null, now = new Date()): FormValues {
  if (!editing) return { kind: 'expense', digits: '', description: '', categoryId: null, date: toIsoDate(now) }
  return {
    kind: editing.amount > 0 ? 'income' : 'expense',
    digits: String(Math.round(Math.abs(editing.amount))),
    description: editing.description,
    categoryId: editing.categoryId,
    date: editing.date.slice(0, 10),
  }
}

/** Valida y arma el cuerpo de POST/PUT api/transactions. */
export function buildRequest(
  values: FormValues,
  categories: CategoryResponse[],
  editing: TransactionResponse | null,
): { ok: true; request: TransactionRequest } | { ok: false; errors: FormErrors } {
  const amount = Number(values.digits || '0')
  const category = categories.find((c) => c.id === values.categoryId)
  const errors: FormErrors = {}
  if (amount <= 0) errors.amount = 'Escribe un monto mayor a cero.'
  // US-04: categoría obligatoria en el registro manual (al editar se respeta una que ya no esté visible)
  if (!values.categoryId || (!category && values.categoryId !== editing?.categoryId)) errors.category = 'Elige una categoría.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) errors.date = 'Elige una fecha.'
  if (Object.keys(errors).length) return { ok: false, errors }

  const description = values.description.trim() || category?.name || editing?.description || 'Movimiento'
  return {
    ok: true,
    request: {
      accountId: editing?.accountId,
      categoryId: values.categoryId,
      amount: values.kind === 'expense' ? -amount : amount,
      currency: editing?.currency ?? 'COP',
      description: description.slice(0, 200),
      date: values.date,
    },
  }
}
