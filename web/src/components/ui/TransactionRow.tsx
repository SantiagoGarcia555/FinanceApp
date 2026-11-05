import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'

// Figma › Componentes › Fila de movimiento (Tipo = Gasto | Ingreso, derivado del signo).
export interface TransactionRowProps {
  title: string
  detail: string
  /** Con signo: negativo = gasto, positivo = ingreso. */
  amount: number
  icon: LucideIcon
  /** Si se pasa, la fila es un botón (p. ej. para editar el movimiento). */
  onClick?: () => void
  className?: string
  style?: CSSProperties
}

export function TransactionRow({ title, detail, amount, icon: Icon, onClick, className, style }: TransactionRowProps) {
  const income = amount > 0
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'grid size-[42px] shrink-0 place-items-center rounded-full',
          income ? 'bg-brand-subtle text-icon-brand' : 'bg-subtle text-icon',
        )}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-label truncate">{title}</span>
        <span className="type-body-sm truncate text-fg-muted">{detail}</span>
      </span>
      <span className={cn('type-label shrink-0 tabular-nums', income ? 'text-fg-brand' : 'text-fg')}>
        <span className="sr-only">{income ? 'Ingreso de ' : 'Gasto de '}</span>
        {formatMoney(amount, { signed: true })}
      </span>
    </>
  )

  return (
    <li className={cn(!onClick && 'flex items-center gap-3 py-3', className)} style={style}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-3 text-left transition hover:bg-subtle/60 focus-visible:outline-2 focus-visible:outline-accent"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </li>
  )
}
