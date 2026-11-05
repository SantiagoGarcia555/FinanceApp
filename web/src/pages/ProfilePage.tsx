import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Avatar, Button } from '../components/ui'

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
      <Button variant="secondary" icon={LogOut} onClick={logout} className="self-start">
        Cerrar sesión
      </Button>
    </main>
  )
}
