import type { TransactionFilters } from '../../api/transactions'
import type { TransactionResponse } from '../../api/types'
import { toIsoDate } from '../../lib/format'

/**
 * Listado de movimientos (1.3.4), sin React Native: se prueba con Node (tests/movements.test.mts).
 * Mismos filtros que web/src/features/transactions/MovementsPage.tsx.
 */

export type KindFilter = 'all' | 'expense' | 'income'

export const PAGE_SIZE = 20

export const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

/** Filtros de la API para un mes completo, un tipo y una categoría ('' = todas). */
export function monthFilters(month: Date, kind: KindFilter, categoryId: string): TransactionFilters {
  return {
    from: toIsoDate(firstOfMonth(month)),
    to: toIsoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
    type: kind === 'all' ? undefined : kind,
    categoryId: categoryId || undefined,
    pageSize: PAGE_SIZE,
  }
}

/**
 * Agrega una página a la lista sin duplicados: si se creó un movimiento mientras se hacía scroll,
 * la paginación por offset puede repetir el último elemento de la página anterior.
 */
export function appendPage(current: TransactionResponse[], next: TransactionResponse[]): TransactionResponse[] {
  const seen = new Set(current.map((t) => t.id))
  return [...current, ...next.filter((t) => !seen.has(t.id))]
}

export interface DaySection {
  /** yyyy-MM-dd */
  day: string
  /** Neto del día (ingresos − gastos) entre los movimientos cargados. */
  total: number
  data: TransactionResponse[]
}

/** Agrupa por día manteniendo el orden de la API (fecha descendente). */
export function groupByDay(items: TransactionResponse[]): DaySection[] {
  const sections: DaySection[] = []
  for (const t of items) {
    const day = t.date.slice(0, 10)
    const last = sections[sections.length - 1]
    if (last?.day === day) {
      last.data.push(t)
      last.total += t.amount
    } else {
      sections.push({ day, total: t.amount, data: [t] })
    }
  }
  return sections
}
