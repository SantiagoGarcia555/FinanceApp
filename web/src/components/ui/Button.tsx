import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

// Figma › Componentes › Botón (Estilo × Tamaño)
const variants = {
  /** Acción más importante de la pantalla. */
  primary: 'bg-brand text-fg-on-brand',
  /** Acción dentro de una tarjeta de marca (p. ej. Insight IA). */
  accent: 'bg-progress text-fg-brand',
  /** Acción de soporte. */
  secondary: 'border-[1.5px] border-line text-fg',
  /** Secundario sobre fondo bosque. */
  'on-brand': 'border-[1.5px] border-line-on-brand/40 text-fg-on-brand',
} as const

const sizes = {
  md: 'type-label gap-2 px-5 py-3',
  sm: 'type-label-sm gap-1.5 px-4 py-2',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: LucideIcon
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition duration-150',
        'hover:brightness-105 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon aria-hidden size={size === 'md' ? 18 : 16} strokeWidth={2} />}
      {children}
    </button>
  )
}
