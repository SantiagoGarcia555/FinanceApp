import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { PublicOnly, RequireAuth } from './auth/guards'
import { BottomNav } from './components/ui'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { BudgetsPage } from './features/budgets/BudgetsPage'
import { CategoriesPage } from './features/categories/CategoriesPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ImportPage } from './features/import/ImportPage'
import { MovementsPage } from './features/transactions/MovementsPage'
import { useTransactions } from './features/transactions/TransactionsContext'
import { TransactionsProvider } from './features/transactions/TransactionsProvider'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { FoundationsPage } from './pages/FoundationsPage'
import { ProfilePage } from './pages/ProfilePage'

/** El botón + de la nav abre el formulario de nuevo movimiento desde cualquier pantalla. */
function Nav() {
  const { openNew } = useTransactions()
  return <BottomNav onAdd={openNew} />
}

/** Layout de la app autenticada: contenido + nav inferior flotante + formulario de movimientos. */
function AppLayout() {
  return (
    <TransactionsProvider>
      <Outlet />
      <Nav />
    </TransactionsProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: 'ingresar', element: <LoginPage /> },
      { path: 'registro', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'analisis', element: <ComingSoonPage title="Análisis" /> },
          { path: 'billetera', element: <ComingSoonPage title="Billetera" /> },
          { path: 'perfil', element: <ProfilePage /> },
          { path: 'movimientos', element: <MovementsPage /> },
          { path: 'importar', element: <ImportPage /> },
          { path: 'presupuestos', element: <BudgetsPage /> },
          { path: 'categorias', element: <CategoriesPage /> },
        ],
      },
    ],
  },
  // Catálogo de fundamentos y componentes (equivale a la página "Componentes" de Figma)
  { path: 'fundamentos', element: <FoundationsPage /> },
  { path: '*', element: <ComingSoonPage title="Página no encontrada" /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
