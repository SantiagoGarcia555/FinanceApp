import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

// Figma › Componentes › Chip (Tono). El tono es semántico: color como dato.
const tones = {
  /** A favor: ingresos, mejoras. */
  positive: { box: 'bg-brand-subtle text-fg-brand', value: '' },
  /** Categorías y datos informativos. */
  neutral: { box: 'bg-subtle text-fg', value: 'text-fg-accent' },
  /** Gasto que se dispara. */
  alert: { box: 'bg-accent-subtle text-fg-accent', value: '' },
  /** Metas y avance. */
  progress: { box: 'bg-progress-subtle text-fg-brand', value: '' },
} as const

export interface ChipProps {
  tone?: keyof typeof tones
  icon?: LucideIcon
  /** Valor destacado a la derecha, p. ej. "$214k". */
  value?: ReactNode
  children: ReactNode
  className?: string
}

export function Chip({ tone = 'neutral', icon: Icon, value, children, className }: ChipProps) {
  const t = tones[tone]
  return (
    <span className={cn('type-label-sm inline-flex items-center gap-1 rounded-full px-3 py-1.5 whitespace-nowrap', t.box, className)}>
      {Icon && <Icon aria-hidden size={14} strokeWidth={2.25} />}
      {children}
      {value != null && <span className={t.value}>{value}</span>}
    </span>
  )
}
