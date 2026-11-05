import { createContext, useContext } from 'react'
import type { CategoryResponse, TransactionResponse } from '../../api/types'

export interface TransactionsContextValue {
  /** Categorías visibles del usuario (sistema + propias). */
  categories: CategoryResponse[]
  /** categoryId → clave de ícono */
  categoryIcons: Record<string, string | null>
  /** Abre el formulario para crear un movimiento. */
  openNew: () => void
  /** Abre el formulario para editar/eliminar un movimiento. */
  openEdit: (transaction: TransactionResponse) => void
  /** Sube cada vez que se crea, edita o elimina un movimiento: las vistas lo usan para recargar. */
  version: number
  /** Avisa que los movimientos cambiaron por otra vía (p. ej. una importación). */
  notifyChanged: () => void
  /** Vuelve a cargar las categorías (tras crear, editar, ocultar o mostrar una). */
  refreshCategories: () => void
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions debe usarse dentro de <TransactionsProvider>')
  return ctx
}
