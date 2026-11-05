import { Sprout } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function Splash() {
  return (
    <div role="status" aria-label="Cargando tu sesión" className="grid min-h-dvh place-items-center">
      <span className="grid size-16 animate-pulse place-items-center rounded-full bg-brand text-icon-on-brand">
        <Sprout aria-hidden size={30} />
      </span>
    </div>
  )
}

/** Rutas que requieren sesión. Si no hay, manda a /ingresar recordando a dónde iba. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Login/registro: si ya hay sesión, no tiene sentido mostrarlos. */
export function PublicOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
