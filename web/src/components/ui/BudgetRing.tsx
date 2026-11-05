import { useId } from 'react'
import { cn } from '../../lib/cn'
import { delay } from '../../lib/motion'

export interface BudgetRingProps {
  /** 0–100 (se recorta a ese rango). */
  percent: number
  /** Texto visible bajo el porcentaje. */
  label?: string
  /** Texto para lectores de pantalla tras el porcentaje (p. ej. "de tus ingresos ya gastado"). */
  description?: string
  size?: number
  /** ms antes de empezar a dibujarse. */
  animationDelay?: number
  className?: string
}

/** Anillo de presupuesto con degradado sol → terracota que se dibuja al entrar. */
export function BudgetRing({ percent, label = 'usado', description, size = 120, animationDelay = 0, className }: BudgetRingProps) {
  const gradientId = useId()
  // El arco se llena hasta 100%, pero el texto muestra el valor real (p. ej. 110% si se excedió)
  const value = Math.min(100, Math.max(0, percent))
  const shown = Math.max(0, Math.round(percent))
  const r = 52
  return (
    <div
      role="img"
      aria-label={`${shown}% ${description ?? `del presupuesto ${label}`}`}
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-bg-progress)" />
            <stop offset="100%" stopColor="var(--color-bg-accent)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-bg-decor)" strokeOpacity={0.7} strokeWidth={12} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          strokeDashoffset={100 - value}
          className="animate-ring"
          style={delay(animationDelay)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-[26px] leading-8 font-semibold tabular-nums', percent > 100 && 'text-fg-accent')}>{shown}%</span>
        <span className="type-body-sm text-fg-muted">{label}</span>
      </span>
    </div>
  )
}
