import { useId } from 'react'
import type { MonthlyTrendPoint } from '../../api/types'
import { formatCompactMoney } from '../../lib/format'
import { delay } from '../../lib/motion'

const W = 320
const BASE = 118 // línea base de las barras
const MAX_H = 104
const BAR = 13
const GAP = 3

const monthShort = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '')
}

/** Ingresos vs gastos de los últimos meses (SVG propio, sin librería de gráficos). */
export function TrendChart({ months, animationDelay = 0 }: { months: MonthlyTrendPoint[]; animationDelay?: number }) {
  const titleId = useId()
  const max = Math.max(1, ...months.flatMap((m) => [m.totalIncome, Math.abs(m.totalExpense)]))
  const slot = W / Math.max(months.length, 1)

  return (
    <figure className="flex flex-col gap-3">
      <div className="type-caption flex gap-4 text-fg-muted" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-brand" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" /> Gastos
        </span>
      </div>

      <svg viewBox={`0 0 ${W} 140`} className="w-full" role="img" aria-labelledby={titleId}>
        <title id={titleId}>Ingresos y gastos de los últimos {months.length} meses</title>
        <line x1="0" x2={W} y1={BASE} y2={BASE} stroke="var(--color-border-subtle)" strokeWidth="1" />
        {months.map((m, i) => {
          const income = (m.totalIncome / max) * MAX_H
          const expense = (Math.abs(m.totalExpense) / max) * MAX_H
          const center = slot * i + slot / 2
          const isLast = i === months.length - 1
          return (
            <g key={m.month}>
              {income > 0 && (
                <rect
                  x={center - BAR - GAP / 2}
                  y={BASE - income}
                  width={BAR}
                  height={income}
                  rx="4"
                  fill="var(--color-bg-brand)"
                  className="animate-bar"
                  style={delay(animationDelay + i * 70)}
                />
              )}
              {expense > 0 && (
                <rect
                  x={center + GAP / 2}
                  y={BASE - expense}
                  width={BAR}
                  height={expense}
                  rx="4"
                  fill="var(--color-bg-accent)"
                  className="animate-bar"
                  style={delay(animationDelay + i * 70 + 40)}
                />
              )}
              <text
                x={center}
                y={BASE + 18}
                textAnchor="middle"
                fontSize="11"
                fontFamily="var(--font-sans)"
                fontWeight={isLast ? 700 : 400}
                fill={isLast ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
              >
                {monthShort(m.month)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Equivalente accesible del gráfico */}
      <table className="sr-only">
        <caption>Ingresos y gastos por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Gastos</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthShort(m.month)}</th>
              <td>{formatCompactMoney(m.totalIncome)}</td>
              <td>{formatCompactMoney(Math.abs(m.totalExpense))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
