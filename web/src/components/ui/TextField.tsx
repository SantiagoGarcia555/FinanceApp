import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: string
}

/** Campo de texto con label, ayuda y error accesibles. type="password" agrega botón mostrar/ocultar. */
export function TextField({ label, error, hint, type = 'text', className, ...rest }: TextFieldProps) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'type-body w-full rounded-md border-[1.5px] bg-surface px-4 py-3 text-fg transition outline-none',
            'placeholder:text-fg-muted/70 focus-visible:ring-4',
            error ? 'border-accent focus-visible:ring-accent/15' : 'border-line focus:border-brand focus-visible:ring-brand/10',
            isPassword && 'pr-12',
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-full text-icon-muted hover:text-icon focus-visible:outline-2 focus-visible:outline-accent"
          >
            {showPassword ? <EyeOff aria-hidden size={20} /> : <Eye aria-hidden size={20} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="type-body-sm text-fg-accent">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="type-body-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
