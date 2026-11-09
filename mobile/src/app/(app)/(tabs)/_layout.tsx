import { Tabs } from 'expo-router'
import { BottomNav, type NavTabKey } from '../../../components/ui'
import { useTransactions } from '../../../features/transactions/TransactionsContext'
import { colors } from '../../../theme'

/** Pestaña de BottomNav → nombre del archivo de la ruta en (tabs)/. */
const ROUTE_BY_TAB: Record<NavTabKey, string> = {
  inicio: 'index',
  analisis: 'analisis',
  billetera: 'billetera',
  perfil: 'perfil',
}
const TAB_BY_ROUTE = Object.fromEntries(Object.entries(ROUTE_BY_TAB).map(([tab, route]) => [route, tab])) as Record<string, NavTabKey>

/** Tabs con la nav flotante. Categorías y hoja de alta/edición vienen de (app)/_layout.tsx. */
export default function TabsLayout() {
  const { openNew } = useTransactions()

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}
      // La nav flotante de la librería reemplaza la barra de tabs por defecto
      tabBar={({ state, navigateToTab }) => (
        <BottomNav
          active={TAB_BY_ROUTE[state.routes[state.index]?.name] ?? 'inicio'}
          onTabPress={(tab) => {
            const route = state.routes.find((r) => r.name === ROUTE_BY_TAB[tab])
            if (route) navigateToTab(route.key)
          }}
          onAdd={openNew}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="analisis" options={{ title: 'Análisis' }} />
      <Tabs.Screen name="billetera" options={{ title: 'Billetera' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  )
}
