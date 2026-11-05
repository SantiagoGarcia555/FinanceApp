import { cn } from '../../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  /** Nombre accesible del grupo. */
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  /** Ocupa todo el ancho repartiendo las opciones. */
  stretch?: boolean
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, className, stretch }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex gap-1 rounded-full bg-subtle p-1', stretch && 'flex w-full', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'type-label-sm rounded-full px-4 py-2 transition duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              stretch && 'flex-1',
              active ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
