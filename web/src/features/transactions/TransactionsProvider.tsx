import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listCategories } from '../../api/transactions'
import type { CategoryResponse, TransactionResponse } from '../../api/types'
import { TransactionsContext, type TransactionsContextValue } from './TransactionsContext'
import { TransactionSheet } from './TransactionSheet'

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryResponse[]>([])
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
        // sin categorías el formulario sigue funcionando ("Sin categoría")
      })
    return () => controller.abort()
  }, [])

  const openNew = useCallback(() => setSheet((s) => ({ open: true, editing: null, key: s.key + 1 })), [])
  const openEdit = useCallback((editing: TransactionResponse) => setSheet((s) => ({ open: true, editing, key: s.key + 1 })), [])
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), [])
  const notifyChanged = useCallback(() => setVersion((v) => v + 1), [])
  const saved = useCallback(() => {
    setVersion((v) => v + 1)
    setSheet((s) => ({ ...s, open: false }))
  }, [])

  const value = useMemo<TransactionsContextValue>(
    () => ({
      categories,
      categoryIcons: Object.fromEntries(categories.map((c) => [c.id, c.icon])),
      openNew,
      openEdit,
      version,
      notifyChanged,
    }),
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
        onClose={close}
        onSaved={saved}
      />
    </TransactionsContext.Provider>
  )
}
