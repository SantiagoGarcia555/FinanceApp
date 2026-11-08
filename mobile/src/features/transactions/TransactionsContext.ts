import { createContext, useContext } from 'react'
import type { CategoryResponse, TransactionResponse } from '../../api/types'

/** Mismo contrato que web/src/features/transactions/TransactionsContext.ts (lo que aplica al móvil). */
export interface TransactionsContextValue {
  /** Categorías visibles del usuario (sistema + propias). */
  categories: CategoryResponse[]
  /** Abre el alta rápida. */
  openNew: () => void
  /** Abre el formulario para editar/eliminar un movimiento. */
  openEdit: (transaction: TransactionResponse) => void
  /** Sube cada vez que se crea, edita o elimina un movimiento: las vistas lo usan para recargar. */
  version: number
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions debe usarse dentro de <TransactionsProvider>')
  return ctx
}
