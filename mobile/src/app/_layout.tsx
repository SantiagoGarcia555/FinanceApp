import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '../auth/AuthContext'
import { AuthProvider } from '../auth/AuthProvider'
import { Splash } from '../components/Splash'
import { colors, useAppFonts } from '../theme'

// Mantiene el splash nativo hasta que carguen Fraunces y DM Sans (evita el salto de fuente).
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useAppFonts()

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync()
  }, [loaded, error])

  if (!loaded && !error) return null

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

/**
 * Rutas protegidas (= RequireAuth / PublicOnly de la web): si cambia la sesión, Expo Router saca
 * al usuario de las pantallas que ya no le corresponden (login → tabs al ingresar; tabs → login
 * al cerrar sesión o si el refresh token expiró).
 */
function RootNavigator() {
  const { status } = useAuth()
  const authenticated = status === 'authenticated'

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'fade' }}>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="fundamentos" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="ingresar" />
          <Stack.Screen name="registro" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
      {status === 'loading' && <Splash />}
    </>
  )
}
