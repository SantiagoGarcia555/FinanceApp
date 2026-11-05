import { cn } from '../../lib/cn'

const dots = {
  accent: 'bg-accent',
  progress: 'bg-progress',
  brand: 'bg-brand',
} as const

export type LegendTone = keyof typeof dots

export interface LegendItemProps {
  tone: LegendTone
  label: string
  value: string
}

export function LegendItem({ tone, label, value }: LegendItemProps) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dots[tone])} />
      <span className="type-body-sm min-w-0 flex-1 truncate text-fg/80">{label}</span>
      <span className="type-label tabular-nums">{value}</span>
    </li>
  )
}
