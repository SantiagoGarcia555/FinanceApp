import { cn } from '../../lib/cn'

const tones = {
  brand: 'bg-brand',
  progress: 'bg-progress',
  accent: 'bg-accent',
} as const

export interface ProgressBarProps {
  /** 0–100; valores mayores se muestran llenos. */
  value: number
  tone?: keyof typeof tones
  /** Nombre accesible, p. ej. "Presupuesto de Alimentación". */
  label: string
  className?: string
}

export function ProgressBar({ value, tone = 'brand', label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-subtle', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tones[tone])} style={{ width: `${clamped}%` }} />
    </div>
  )
}
