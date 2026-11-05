import { useEffect, useMemo, useState } from 'react'
import { CloudOff, Plus } from 'lucide-react'
import { budgetTone, listBudgets } from '../../api/budgets'
import { ApiError } from '../../api/client'
import type { BudgetResponse } from '../../api/types'
import { BudgetRing, Button, categoryIcon, Chip, ProgressBar } from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatCompactMoney, formatMoney, formatMonthYear } from '../../lib/format'
import { useTransactions } from '../transactions/TransactionsContext'
import { BudgetSheet } from './BudgetSheet'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; budgets: BudgetResponse[] }

export function BudgetsPage() {
  const { categories, version } = useTransactions()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [sheet, setSheet] = useState<{ open: boolean; editing: BudgetResponse | null; key: number }>({ open: false, editing: null, key: 0 })
  const [monthLabel] = useState(() => formatMonthYear(new Date()))

  useEffect(() => {
    const controller = new AbortController()
    listBudgets(undefined, controller.signal)
      .then((budgets) => setState({ status: 'ready', budgets }))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: e instanceof ApiError ? e.message : 'No pudimos cargar tus presupuestos.' })
      })
    return () => controller.abort()
  }, [version, reloadKey])

  // Los ingresos no se presupuestan
  const expenseCategories = useMemo(() => categories.filter((c) => c.icon !== 'income'), [categories])
  const budgets = state.status === 'ready' ? state.budgets : []
  const monthly = budgets.filter((b) => b.period === 'monthly')
  const totalLimit = monthly.reduce((acc, b) => acc + b.limitAmount, 0)
  const totalSpent = monthly.reduce((acc, b) => acc + b.spent, 0)

  const openNew = () => setSheet((s) => ({ open: true, editing: null, key: s.key + 1 }))
  const openEdit = (editing: BudgetResponse) => setSheet((s) => ({ open: true, editing, key: s.key + 1 }))
  const onSaved = () => {
    setSheet((s) => ({ ...s, open: false }))
    setReloadKey((k) => k + 1)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-6 pb-36">
      <header className="flex flex-col gap-1">
        <p className="type-caption text-fg-muted">{monthLabel}</p>
        <h1 className="type-h1">Presupuestos</h1>
      </header>

      {state.status === 'loading' && (
        <div role="status" aria-label="Cargando presupuestos" className="flex flex-col gap-3">
          <div className="h-40 animate-pulse rounded-lg bg-subtle" />
          <div className="h-24 animate-pulse rounded-lg bg-subtle" />
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

      {state.status === 'ready' && budgets.length === 0 && (
        <section className="flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-8 text-center shadow-card">
          <p className="type-h3">Pon límites a tus gastos</p>
          <p className="type-body-sm text-fg-muted">
            Define cuánto quieres gastar al mes en comida, transporte u ocio y te mostraremos cómo vas en el inicio.
          </p>
          <Button icon={Plus} onClick={openNew}>
            Crear mi primer presupuesto
          </Button>
        </section>
      )}

      {state.status === 'ready' && monthly.length > 0 && (
        <section aria-label="Resumen del mes" className="flex items-center gap-5 rounded-lg bg-surface p-5 shadow-card">
          <BudgetRing percent={totalLimit ? (totalSpent / totalLimit) * 100 : 0} description="de tu presupuesto mensual usado" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="type-body-sm text-fg-muted">Gastado este mes</span>
            <span className="type-h2 tabular-nums">{formatMoney(totalSpent)}</span>
            <span className="type-body-sm text-fg-muted">de {formatMoney(totalLimit)}</span>
            <Chip tone={totalSpent > totalLimit ? 'alert' : 'positive'} className="mt-1 self-start">
              {totalSpent > totalLimit ? `Excedido ${formatCompactMoney(totalSpent - totalLimit)}` : `Quedan ${formatCompactMoney(totalLimit - totalSpent)}`}
            </Chip>
          </div>
        </section>
      )}

      {state.status === 'ready' && budgets.length > 0 && (
        <ul className="flex flex-col gap-3">
          {budgets.map((b) => {
            const Icon = categoryIcon(b.icon)
            const tone = budgetTone(b.percentUsed)
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  className="flex w-full flex-col gap-3 rounded-lg bg-surface p-4 text-left shadow-card transition hover:brightness-[1.01] focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle text-icon">
                      <Icon size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="type-label truncate">
                        {b.categoryName}
                        {b.period === 'yearly' && <span className="type-caption ml-2 text-fg-muted">anual</span>}
                      </span>
                      <span className="type-body-sm text-fg-muted tabular-nums">
                        {formatMoney(b.spent)} de {formatMoney(b.limitAmount)}
                      </span>
                    </span>
                    <span className={cn('type-label tabular-nums', tone === 'accent' ? 'text-fg-accent' : 'text-fg')}>{Math.round(b.percentUsed)}%</span>
                  </span>
                  <ProgressBar value={b.percentUsed} tone={tone} label={`Presupuesto de ${b.categoryName}`} />
                  <span className={cn('type-body-sm', b.remaining < 0 ? 'text-fg-accent' : 'text-fg-muted')}>
                    {b.remaining < 0 ? `Te pasaste por ${formatMoney(-b.remaining)}` : `Te quedan ${formatMoney(b.remaining)}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {state.status === 'ready' && budgets.length > 0 && (
        <Button variant="secondary" icon={Plus} onClick={openNew} className="self-center">
          Agregar presupuesto
        </Button>
      )}

      <BudgetSheet
        open={sheet.open}
        formKey={sheet.key}
        editing={sheet.editing}
        categories={expenseCategories}
        existing={budgets}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={onSaved}
      />
    </main>
  )
}
