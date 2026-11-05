import { ChevronRight, FileUp, LogOut, PiggyBank, Tags, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar, Button } from '../components/ui'

const SETTINGS: Array<{ to: string; label: string; detail: string; icon: LucideIcon }> = [
  { to: '/categorias', label: 'Categorías', detail: 'Crea las tuyas y oculta las que no uses', icon: Tags },
  { to: '/presupuestos', label: 'Presupuestos', detail: 'Límites de gasto por categoría', icon: PiggyBank },
  { to: '/importar', label: 'Importar extracto', detail: 'Carga movimientos desde CSV o Excel', icon: FileUp },
]

export function ProfilePage() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-10 pb-36">
      <h1 className="type-h1">Perfil</h1>
      <section className="flex items-center gap-4 rounded-lg bg-surface p-5 shadow-card">
        <Avatar name={user.name} className="size-14" />
        <div className="flex min-w-0 flex-col">
          <span className="type-h3 truncate">{user.name}</span>
          <span className="type-body-sm truncate text-fg-muted">{user.email}</span>
          <span className="type-caption text-fg-muted">Moneda: {user.preferredCurrency}</span>
        </div>
      </section>

      <nav aria-label="Configuración">
        <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
          {SETTINGS.map(({ to, label, detail, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition hover:bg-subtle/60 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-subtle text-icon-brand">
                  <Icon size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="type-label">{label}</span>
                  <span className="type-body-sm truncate text-fg-muted">{detail}</span>
                </span>
                <ChevronRight aria-hidden size={18} className="text-icon-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Button variant="secondary" icon={LogOut} onClick={logout} className="self-start">
        Cerrar sesión
      </Button>
    </main>
  )
}
