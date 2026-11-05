import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  error?: string
  /** Oculta el label visualmente (sigue disponible para lectores de pantalla). */
  hideLabel?: boolean
}

/** Select nativo con el estilo de TextField (accesible y con buen soporte móvil). */
export function SelectField({ label, error, hideLabel, className, children, ...rest }: SelectFieldProps) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('type-label', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'type-body w-full appearance-none rounded-md border-[1.5px] bg-surface py-3 pr-11 pl-4 text-fg transition outline-none',
            'focus-visible:ring-4',
            error ? 'border-accent focus-visible:ring-accent/15' : 'border-line focus:border-brand focus-visible:ring-brand/10',
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown aria-hidden size={18} className="pointer-events-none absolute inset-y-0 right-4 my-auto text-icon-muted" />
      </div>
      {error && (
        <p id={`${id}-error`} className="type-body-sm text-fg-accent">
          {error}
        </p>
      )}
    </div>
  )
}
