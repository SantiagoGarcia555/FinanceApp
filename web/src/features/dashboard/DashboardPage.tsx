import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Bell, CloudOff, Sun } from 'lucide-react'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import {
  Avatar,
  BudgetRing,
  Button,
  categoryIcon,
  Chip,
  IconButton,
  InsightCard,
  LegendItem,
  SectionHeader,
  TransactionRow,
  type LegendTone,
} from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatCompactMoney, formatMoney, formatMonthName, formatNumber, formatPercent, formatRelativeDay, formatToday } from '../../lib/format'
import { delay } from '../../lib/motion'
import { useTransactions } from '../transactions/TransactionsContext'
import { loadDashboard, type DashboardData } from './dashboardData'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: DashboardData }

const LEGEND_TONES: LegendTone[] = ['accent', 'progress', 'brand']

/** Entrada escalonada: retardo + distancia desde la que sube. */
function rise(ms: number, from = 24): CSSProperties {
  return { ...delay(ms), '--rise-from': `${from}px` } as CSSProperties
}

/** "2026-11" → "oct" (mes anterior, abreviado) */
function previousMonthShort(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(y, m - 2, 1)).replace('.', '')
}

function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="animate-drift absolute -top-[120px] left-[170px] size-80 rounded-[42%_58%_63%_37%/41%_44%_56%_59%] bg-decor opacity-85" />
      <div className="animate-drift absolute top-[300px] -left-[110px] size-60 rounded-[58%_42%_38%_62%/52%_61%_39%_48%] bg-progress opacity-20 [animation-direction:alternate-reverse]" />
      <div className="animate-drift absolute top-[600px] left-[180px] size-[280px] rounded-[63%_37%_54%_46%/55%_48%_52%_45%] bg-accent opacity-10" />
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-subtle', className)} />
}

export function DashboardPage() {
  const { user } = useAuth()
  const { version, openEdit } = useTransactions()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [insightDismissed, setInsightDismissed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    loadDashboard(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: error instanceof ApiError ? error.message : 'No pudimos cargar tu resumen.' })
      })
    return () => controller.abort()
  }, [reloadKey, version])

  const retry = () => {
    setState({ status: 'loading' })
    setReloadKey((k) => k + 1)
  }

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden">
      <Blobs />

      <main className="relative z-10 flex flex-col gap-5 px-5 pt-6 pb-36">
        <header className="animate-rise flex items-center justify-between" style={rise(100, -14)}>
          <div className="flex flex-col">
            <p className="type-body-sm flex items-center gap-1.5 text-fg-muted">
              <Sun aria-hidden size={15} className="text-progress" />
              {formatToday()}
            </p>
            <h1 className="type-h1">Hola{firstName && `, ${firstName}`}</h1>
          </div>
          <div className="flex items-center gap-2">
            <IconButton icon={Bell} label="Notificaciones" />
            {user && <Avatar name={user.name} />}
          </div>
        </header>

        {state.status === 'loading' && (
          <div role="status" aria-label="Cargando tu resumen" className="flex flex-col gap-5 pt-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-14 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {state.status === 'error' && (
          <section role="alert" className="mt-6 flex flex-col items-center gap-3 rounded-lg bg-surface p-6 text-center shadow-card">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-accent-subtle text-fg-accent">
              <CloudOff size={24} />
            </span>
            <h2 className="type-h3">No pudimos cargar tu resumen</h2>
            <p className="type-body-sm text-fg-muted">{state.message}</p>
            <Button onClick={retry}>Reintentar</Button>
          </section>
        )}

        {state.status === 'ready' && (
          <Dashboard
            data={state.data}
            showInsight={!insightDismissed}
            onDismissInsight={() => setInsightDismissed(true)}
            onNavigate={navigate}
            onEdit={openEdit}
          />
        )}
      </main>
    </div>
  )
}

function Dashboard({
  data,
  showInsight,
  onDismissInsight,
  onNavigate,
  onEdit,
}: {
  data: DashboardData
  showInsight: boolean
  onDismissInsight: () => void
  onNavigate: (to: string) => void
  onEdit: (transaction: DashboardData['recentTransactions'][number]) => void
}) {
  const { summary, previousMonth, recentTransactions, categoryIcons } = data
  const hasActivity = summary.totalIncome !== 0 || summary.totalExpense !== 0 || recentTransactions.length > 0
  const spent = Math.abs(summary.totalExpense)
  const negative = summary.balance < 0

  const trend =
    previousMonth && previousMonth.balance !== 0
      ? ((summary.balance - previousMonth.balance) / Math.abs(previousMonth.balance)) * 100
      : null

  const topCategories = summary.expensesByCategory.slice(0, 3)
  const top = summary.expensesByCategory[0]
  const topShare = top && spent > 0 ? Math.round((top.total / spent) * 100) : 0

  return (
    <>
      {/* Saldo del mes */}
      <section aria-labelledby="saldo" className="flex flex-col gap-1 pt-1.5">
        <h2 id="saldo" className="type-body-sm animate-rise text-fg-muted" style={rise(300, 10)}>
          Disponible este mes
        </h2>
        <p className={cn('animate-rise flex items-baseline gap-1.5', negative && 'text-fg-accent')} style={rise(400, 30)}>
          <span className={cn('font-display text-[30px] font-light', !negative && 'text-fg-muted')}>{negative ? '−$' : '$'}</span>
          <span className="type-monto">{formatNumber(Math.abs(summary.balance))}</span>
        </p>
        {hasActivity && (
          <div className="animate-rise flex flex-wrap gap-2 pt-2" style={rise(750, 12)}>
            {trend !== null && (
              <Chip tone={trend >= 0 ? 'positive' : 'alert'} icon={trend >= 0 ? ArrowUpRight : ArrowDownRight}>
                {formatPercent(Math.abs(trend))} vs {previousMonthShort(summary.month)}
              </Chip>
            )}
            {spent > 0 && <Chip>Gastos del mes: {formatCompactMoney(spent)}</Chip>}
          </div>
        )}
      </section>

      {/* Gasto del mes por categoría (sustituye al presupuesto hasta que exista el endpoint) */}
      {topCategories.length > 0 && (
        <section
          aria-labelledby="gastos"
          className="animate-rise flex items-center gap-5 rounded-lg bg-surface p-5 shadow-card"
          style={rise(900, 30)}
        >
          {summary.totalIncome > 0 && (
            <BudgetRing
              percent={(spent / summary.totalIncome) * 100}
              label="gastado"
              description="de tus ingresos ya gastado"
              animationDelay={1000}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h2 id="gastos" className="type-h3">
              {formatMonthName(summary.month)}
            </h2>
            <ul className="flex flex-col gap-3">
              {topCategories.map((c, i) => (
                <LegendItem key={c.categoryId ?? c.categoryName} tone={LEGEND_TONES[i]} label={c.categoryName} value={formatCompactMoney(c.total)} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Sugerencia: calculada de los datos reales hasta que llegue ISavingsInsightService (fase 2) */}
      {!hasActivity ? (
        <div className="animate-rise" style={rise(1100, 36)}>
          <InsightCard
            title="Empecemos a echar raíces"
            message="Registra tu primer movimiento o importa el extracto de tu banco y aquí verás a dónde se va tu plata."
            primaryAction={{ label: 'Importar extracto', onClick: () => onNavigate('/importar') }}
          />
        </div>
      ) : (
        showInsight &&
        top &&
        topShare > 0 && (
          <div className="animate-rise" style={rise(1300, 36)}>
            <InsightCard
              className="animate-halo"
              message={`Este mes, ${top.categoryName} se lleva el ${topShare}% de tus gastos (${formatMoney(top.total)}). Revisa si hay algo que puedas ajustar.`}
              primaryAction={{ label: 'Ver movimientos', onClick: () => onNavigate('/movimientos') }}
              secondaryAction={{ label: 'Después', onClick: onDismissInsight }}
            />
          </div>
        )
      )}

      {/* Movimientos recientes */}
      <section aria-labelledby="movimientos" className="flex flex-col gap-3">
        <div className="animate-rise" style={rise(1600, 16)}>
          <SectionHeader id="movimientos" title="Movimientos" action={recentTransactions.length ? { label: 'Ver todo', to: '/movimientos' } : undefined} />
        </div>
        {recentTransactions.length > 0 ? (
          <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
            {recentTransactions.map((t, i) => (
              <TransactionRow
                key={t.id}
                className="animate-rise"
                style={rise(1750 + i * 120, 18)}
                title={t.description}
                detail={`${t.categoryName ?? 'Sin categoría'} · ${formatRelativeDay(t.date)}`}
                amount={t.amount}
                icon={categoryIcon(t.categoryId ? categoryIcons[t.categoryId] : null)}
                onClick={() => onEdit(t)}
              />
            ))}
          </ul>
        ) : (
          <p className="type-body-sm animate-rise rounded-lg bg-surface px-5 py-6 text-center text-fg-muted shadow-card" style={rise(1750, 18)}>
            Aún no tienes movimientos. Usa el botón <span className="type-label text-fg-accent">+</span> para registrar el primero.
          </p>
        )}
      </section>
    </>
  )
}
