import { useState } from 'react'
import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { BottomNav, Sheet, type NavTabKey } from '../../components/ui'
import { colors, type } from '../../theme'

/** Pestaña de BottomNav → nombre del archivo de la ruta en (tabs)/. */
const ROUTE_BY_TAB: Record<NavTabKey, string> = {
  inicio: 'index',
  analisis: 'analisis',
  billetera: 'billetera',
  perfil: 'perfil',
}
const TAB_BY_ROUTE = Object.fromEntries(Object.entries(ROUTE_BY_TAB).map(([tab, route]) => [route, tab])) as Record<string, NavTabKey>

export default function TabsLayout() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
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
            onAdd={() => setAddOpen(true)}
          />
        )}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="analisis" options={{ title: 'Análisis' }} />
        <Tabs.Screen name="billetera" options={{ title: 'Billetera' }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      </Tabs>

      {/* El alta rápida llega en 1.3.3; por ahora el + explica qué viene */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Nuevo movimiento">
        <Text style={[type.body, { color: colors.fgMuted }]}>
          Muy pronto vas a poder registrar un gasto o ingreso en pocos toques desde aquí. Mientras tanto, puedes hacerlo desde la web.
        </Text>
      </Sheet>
    </>
  )
}
