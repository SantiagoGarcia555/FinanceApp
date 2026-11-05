import { ChartColumn, House, Plus, User, Wallet, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { delay } from '../../lib/motion'
import { IconButton } from './IconButton'

// Figma › Componentes › Nav inferior: flotante, 4 tabs + FAB central.
const tabs: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/analisis', label: 'Análisis', icon: ChartColumn },
  { to: '/billetera', label: 'Billetera', icon: Wallet },
  { to: '/perfil', label: 'Perfil', icon: User },
]

function Tab({ to, label, icon: Icon }: (typeof tabs)[number]) {
  return (
    <NavLink
      to={to}
      end
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        cn(
          'grid size-11 place-items-center rounded-full transition duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          isActive ? 'bg-brand text-icon-on-brand' : 'text-icon-muted hover:text-icon',
        )
      }
    >
      <Icon aria-hidden size={20} strokeWidth={2} />
    </NavLink>
  )
}

export function BottomNav({ onAdd }: { onAdd?: () => void }) {
  return (
    <nav
      aria-label="Principal"
      className="animate-nav-in fixed inset-x-0 bottom-6 z-20 mx-auto flex h-[68px] w-[calc(100%-40px)] max-w-[350px] items-center justify-between rounded-full bg-surface px-3 shadow-card"
      style={delay(200)}
    >
      <Tab {...tabs[0]} />
      <Tab {...tabs[1]} />
      <IconButton icon={Plus} label="Nuevo movimiento" variant="accent" size="lg" onClick={onAdd} />
      <Tab {...tabs[2]} />
      <Tab {...tabs[3]} />
    </nav>
  )
}
