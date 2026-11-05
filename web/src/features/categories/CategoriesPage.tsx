import { createElement, useEffect, useState } from 'react'
import { ChevronRight, CloudOff, Eye, EyeOff, Plus } from 'lucide-react'
import { deleteOrHideCategory, listAllCategories, unhideCategory } from '../../api/categories'
import { ApiError } from '../../api/client'
import type { CategoryResponse } from '../../api/types'
import { Button, categoryIcon } from '../../components/ui'
import { cn } from '../../lib/cn'
import { FormError } from '../auth/AuthLayout'
import { useTransactions } from '../transactions/TransactionsContext'
import { CategorySheet } from './CategorySheet'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; categories: CategoryResponse[] }

function CategoryIcon({ icon, muted }: { icon: string | null; muted?: boolean }) {
  return (
    <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-subtle', muted ? 'text-icon-muted' : 'text-icon')}>
      {createElement(categoryIcon(icon), { size: 20 })}
    </span>
  )
}

export function CategoriesPage() {
  const { refreshCategories } = useTransactions()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; editing: CategoryResponse | null; key: number }>({ open: false, editing: null, key: 0 })

  useEffect(() => {
    const controller = new AbortController()
    listAllCategories(controller.signal)
      .then((categories) => setState({ status: 'ready', categories }))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: e instanceof ApiError ? e.message : 'No pudimos cargar tus categorías.' })
      })
    return () => controller.abort()
  }, [reloadKey])

  const changed = () => {
    setReloadKey((k) => k + 1)
    refreshCategories() // el formulario de movimientos y el dashboard también se actualizan
  }

  async function toggleHidden(category: CategoryResponse) {
    setError(null)
    setToggling(category.id)
    try {
      if (category.isHidden) await unhideCategory(category.id)
      else await deleteOrHideCategory(category.id)
      changed()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos actualizar la categoría.')
    } finally {
      setToggling(null)
    }
  }

  const categories = state.status === 'ready' ? state.categories : []
  const own = categories.filter((c) => !c.isSystemDefined)
  const system = categories.filter((c) => c.isSystemDefined)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-6 pb-36">
      <header className="flex flex-col gap-1">
        <h1 className="type-h1">Categorías</h1>
        <p className="type-body-sm text-fg-muted">Crea las tuyas y oculta las que no uses. Las ocultas no aparecen al registrar movimientos.</p>
      </header>

      <FormError message={error} />

      {state.status === 'loading' && (
        <div role="status" aria-label="Cargando categorías" className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-lg bg-subtle" />
          <div className="h-72 animate-pulse rounded-lg bg-subtle" />
        </div>
      )}

      {state.status === 'error' && (
        <section role="alert" className="flex flex-col items-center gap-3 rounded-lg bg-surface p-6 text-center shadow-card">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-accent-subtle text-fg-accent">
            <CloudOff size={24} />
          </span>
          <p className="type-body-sm text-fg-muted">{state.message}</p>
          <Button
            onClick={() => {
              setState({ status: 'loading' })
              setReloadKey((k) => k + 1)
            }}
          >
            Reintentar
          </Button>
        </section>
      )}

      {state.status === 'ready' && (
        <>
          <section aria-labelledby="propias" className="flex flex-col gap-3">
            <h2 id="propias" className="type-h3 px-1">
              Tus categorías
            </h2>
            {own.length === 0 ? (
              <p className="type-body-sm rounded-lg bg-surface px-5 py-5 text-fg-muted shadow-card">
                Aún no tienes categorías propias. Crea una para gastos que no encajan en las predefinidas.
              </p>
            ) : (
              <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
                {own.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSheet((s) => ({ open: true, editing: c, key: s.key + 1 }))}
                      className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-3 text-left transition hover:bg-subtle/60 focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <CategoryIcon icon={c.icon} />
                      <span className="type-label flex-1 truncate">{c.name}</span>
                      <ChevronRight aria-hidden size={18} className="text-icon-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" icon={Plus} onClick={() => setSheet((s) => ({ open: true, editing: null, key: s.key + 1 }))} className="self-start">
              Nueva categoría
            </Button>
          </section>

          <section aria-labelledby="predefinidas" className="flex flex-col gap-3">
            <h2 id="predefinidas" className="type-h3 px-1">
              Predefinidas
            </h2>
            <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
              {system.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b border-line/60 py-3 last:border-0">
                  <CategoryIcon icon={c.icon} muted={c.isHidden} />
                  <span className={cn('type-label flex-1 truncate', c.isHidden && 'text-fg-muted')}>
                    {c.name}
                    {c.isHidden && <span className="type-caption ml-2">oculta</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleHidden(c)}
                    disabled={toggling === c.id}
                    aria-label={c.isHidden ? `Mostrar ${c.name}` : `Ocultar ${c.name}`}
                    className="type-label-sm flex items-center gap-1.5 rounded-full px-3 py-2 text-fg-muted transition hover:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
                  >
                    {c.isHidden ? <Eye aria-hidden size={16} /> : <EyeOff aria-hidden size={16} />}
                    {c.isHidden ? 'Mostrar' : 'Ocultar'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <CategorySheet
        open={sheet.open}
        formKey={sheet.key}
        editing={sheet.editing}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={() => {
          setSheet((s) => ({ ...s, open: false }))
          changed()
        }}
      />
    </main>
  )
}
