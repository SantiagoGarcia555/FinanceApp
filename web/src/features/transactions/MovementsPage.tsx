import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CloudOff, Plus } from 'lucide-react'
import { api, ApiError } from '../../api/client'
import { listTransactions, type TransactionFilters } from '../../api/transactions'
import type { MonthlySummaryResponse, TransactionResponse } from '../../api/types'
import { Button, categoryIcon, Chip, SegmentedControl, SelectField, TransactionRow } from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatCompactMoney, formatDayHeading, formatMonthYear, toIsoDate } from '../../lib/format'
import { useTransactions } from './TransactionsContext'

type Kind = 'all' | 'expense' | 'income'

const KIND_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'expense' as const, label: 'Gastos' },
  { value: 'income' as const, label: 'Ingresos' },
]

const PAGE_SIZE = 20

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const lastOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

type Status = 'loading' | 'ready' | 'error'

export function MovementsPage() {
  const { categories, categoryIcons, openEdit, openNew, version } = useTransactions()

  const [thisMonth] = useState(() => firstOfMonth(new Date()))
  const [month, setMonth] = useState(thisMonth)
  const [kind, setKind] = useState<Kind>('all')
  const [categoryId, setCategoryId] = useState('')

  const [items, setItems] = useState<TransactionResponse[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const isCurrentMonth = month.getTime() === thisMonth.getTime()

  const filters = useMemo<TransactionFilters>(
    () => ({
      from: toIsoDate(month),
      to: toIsoDate(lastOfMonth(month)),
      type: kind === 'all' ? undefined : kind,
      categoryId: categoryId || undefined,
      pageSize: PAGE_SIZE,
    }),
    [month, kind, categoryId],
  )

  // Primera página + resumen del mes (recarga al cambiar filtros o al guardar un movimiento)
  useEffect(() => {
    // Al cambiar filtros se mantiene la lista anterior visible hasta que llegue la nueva (sin parpadeo).
    const controller = new AbortController()
    Promise.all([
      listTransactions({ ...filters, page: 1 }, controller.signal),
      api<MonthlySummaryResponse>(`/api/dashboard/summary?month=${filters.from!.slice(0, 7)}`, { signal: controller.signal }),
    ])
      .then(([result, monthSummary]) => {
        setItems(result.items)
        setPage(1)
        setTotalCount(result.totalCount)
        setTotalPages(result.totalPages)
        setSummary(monthSummary)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        setError(e instanceof ApiError ? e.message : 'No pudimos cargar tus movimientos.')
        setStatus('error')
      })
    return () => controller.abort()
  }, [filters, version, retryKey])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const result = await listTransactions({ ...filters, page: page + 1 })
      setItems((prev) => [...prev, ...result.items])
      setPage(result.page)
      setTotalPages(result.totalPages)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar más movimientos.')
    } finally {
      setLoadingMore(false)
    }
  }

  // Agrupa por día manteniendo el orden de la API (fecha descendente)
  const groups = useMemo(() => {
    const byDay = new Map<string, TransactionResponse[]>()
    for (const t of items) {
      const day = t.date.slice(0, 10)
      byDay.set(day, [...(byDay.get(day) ?? []), t])
    }
    return [...byDay.entries()]
  }, [items])

  const filtered = kind !== 'all' || categoryId !== ''

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-6 pb-36">
      <header className="flex items-center justify-between">
        <h1 className="type-h1">Movimientos</h1>
        {status === 'ready' && (
          <span className="type-body-sm text-fg-muted" aria-live="polite">
            {totalCount} {totalCount === 1 ? 'movimiento' : 'movimientos'}
          </span>
        )}
      </header>

      {/* Mes */}
      <div className="flex items-center justify-between rounded-full bg-surface p-1.5 shadow-card">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Mes anterior"
          className="grid size-10 place-items-center rounded-full text-icon hover:bg-subtle focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronLeft aria-hidden size={20} />
        </button>
        <span className="type-label" aria-live="polite">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={isCurrentMonth}
          aria-label="Mes siguiente"
          className="grid size-10 place-items-center rounded-full text-icon hover:bg-subtle focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight aria-hidden size={20} />
        </button>
      </div>

      {summary && (summary.totalIncome !== 0 || summary.totalExpense !== 0) && (
        <div className="flex flex-wrap gap-2">
          <Chip tone="positive">Ingresos {formatCompactMoney(summary.totalIncome)}</Chip>
          <Chip>Gastos {formatCompactMoney(Math.abs(summary.totalExpense))}</Chip>
          <Chip tone={summary.balance < 0 ? 'alert' : 'progress'}>Balance {formatCompactMoney(summary.balance)}</Chip>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <SegmentedControl label="Tipo de movimiento" options={KIND_OPTIONS} value={kind} onChange={setKind} stretch />
        <SelectField label="Categoría" hideLabel value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      </div>

      {/* Lista */}
      {status === 'loading' && (
        <div role="status" aria-label="Cargando movimientos" className="flex flex-col gap-3">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-subtle" />
          <div className="h-56 animate-pulse rounded-lg bg-subtle" />
        </div>
      )}

      {status === 'error' && (
        <section role="alert" className="flex flex-col items-center gap-3 rounded-lg bg-surface p-6 text-center shadow-card">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-accent-subtle text-fg-accent">
            <CloudOff size={24} />
          </span>
          <p className="type-body-sm text-fg-muted">{error}</p>
          <Button
            onClick={() => {
              setStatus('loading')
              setRetryKey((k) => k + 1)
            }}
          >
            Reintentar
          </Button>
        </section>
      )}

      {status === 'ready' && items.length === 0 && (
        <section className="flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-8 text-center shadow-card">
          <p className="type-h3">{filtered ? 'Nada con esos filtros' : 'Sin movimientos este mes'}</p>
          <p className="type-body-sm text-fg-muted">
            {filtered ? 'Prueba con otro tipo o categoría.' : 'Registra lo que gastas y recibes para ver a dónde se va tu plata.'}
          </p>
          {!filtered && (
            <Button icon={Plus} onClick={openNew}>
              Agregar movimiento
            </Button>
          )}
        </section>
      )}

      {status === 'ready' &&
        groups.map(([day, dayItems]) => (
          <section key={day} aria-label={formatDayHeading(day)} className="flex flex-col gap-2">
            <h2 className="type-label-sm px-1 text-fg-muted">{formatDayHeading(day)}</h2>
            <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
              {dayItems.map((t) => (
                <TransactionRow
                  key={t.id}
                  title={t.description}
                  detail={t.categoryName ?? 'Sin categoría'}
                  amount={t.amount}
                  icon={categoryIcon(t.categoryId ? categoryIcons[t.categoryId] : null)}
                  onClick={() => openEdit(t)}
                />
              ))}
            </ul>
          </section>
        ))}

      {status === 'ready' && page < totalPages && (
        <Button variant="secondary" onClick={loadMore} disabled={loadingMore} className={cn('self-center')}>
          {loadingMore ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
    </main>
  )
}
