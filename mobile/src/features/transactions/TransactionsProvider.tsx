import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listCategories } from '../../api/transactions'
import type { CategoryResponse, TransactionResponse } from '../../api/types'
import { TransactionsContext, type TransactionsContextValue } from './TransactionsContext'
import { TransactionSheet } from './TransactionSheet'

/** Categorías + hoja de alta/edición compartidas por las pantallas con sesión (= TransactionsProvider de la web). */
export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [categoriesKey, setCategoriesKey] = useState(0)
  const [version, setVersion] = useState(0)
  const [sheet, setSheet] = useState<{ open: boolean; editing: TransactionResponse | null; key: number }>({
    open: false,
    editing: null,
    key: 0,
  })

  useEffect(() => {
    const controller = new AbortController()
    listCategories(controller.signal)
      .then((all) => setCategories(all.filter((c) => !c.isHidden)))
      .catch(() => {
        // La hoja ofrece reintentar si al abrirla no hay categorías
      })
    return () => controller.abort()
  }, [categoriesKey])

  const reloadCategories = useCallback(() => setCategoriesKey((k) => k + 1), [])
  const openNew = useCallback(() => setSheet((s) => ({ open: true, editing: null, key: s.key + 1 })), [])
  const openEdit = useCallback((editing: TransactionResponse) => setSheet((s) => ({ open: true, editing, key: s.key + 1 })), [])
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), [])
  const notifyChanged = useCallback(() => setVersion((v) => v + 1), [])
  const saved = useCallback(() => {
    setVersion((v) => v + 1)
    setSheet((s) => ({ ...s, open: false }))
  }, [])

  const value = useMemo<TransactionsContextValue>(
    () => ({ categories, openNew, openEdit, version, notifyChanged }),
    [categories, openNew, openEdit, version, notifyChanged],
  )

  return (
    <TransactionsContext.Provider value={value}>
      {children}
      <TransactionSheet
        open={sheet.open}
        formKey={sheet.key}
        editing={sheet.editing}
        categories={categories}
        onReloadCategories={reloadCategories}
        onClose={close}
        onSaved={saved}
      />
    </TransactionsContext.Provider>
  )
}
