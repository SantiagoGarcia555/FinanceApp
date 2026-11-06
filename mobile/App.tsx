import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FundamentosScreen } from './src/screens/FundamentosScreen'
import { useAppFonts } from './src/theme'

// Mantiene el splash hasta que carguen Fraunces y DM Sans (evita el salto de fuente).
SplashScreen.preventAutoHideAsync()

export default function App() {
  const [loaded, error] = useAppFonts()

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync()
  }, [loaded, error])

  if (!loaded && !error) return null

  // 1.3.0: la app abre el catálogo de componentes. En 1.3.1 esto pasa a Expo Router + auth.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <FundamentosScreen />
    </SafeAreaProvider>
  )
}
