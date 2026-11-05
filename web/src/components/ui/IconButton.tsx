import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

// Figma › Componentes › Botón de ícono (Estilo × Tamaño). Acento + lg = FAB.
const variants = {
  surface: 'bg-surface text-icon shadow-card',
  brand: 'bg-brand text-icon-on-brand',
  accent: 'bg-accent text-icon-on-accent shadow-fab',
} as const

const sizes = {
  md: { box: 'size-11', icon: 20 },
  lg: { box: 'size-[54px]', icon: 24 },
} as const

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon
  /** Obligatorio: es el nombre accesible del botón. */
  label: string
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function IconButton({ icon: Icon, label, variant = 'surface', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  const s = sizes[size]
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full transition duration-150',
        'hover:brightness-105 active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        variants[variant],
        s.box,
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden size={s.icon} strokeWidth={2} />
    </button>
  )
}
