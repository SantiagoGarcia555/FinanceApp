import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { useShareIntentContext } from 'expo-share-intent'
import { fileFromShare, toRouteParams } from '../../features/import/importFlow'
import { TransactionsProvider } from '../../features/transactions/TransactionsProvider'
import { colors } from '../../theme'

/**
 * Pantallas con sesión. Comparten categorías + hoja de alta/edición (TransactionsProvider), así el
 * importador puede pedir que el dashboard y la lista se recarguen.
 */
export default function AppLayout() {
  return (
    <TransactionsProvider>
      <ShareIntentRedirect />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fundamentos" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="importar" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </TransactionsProvider>
  )
}

/**
 * "Compartir con Tino" desde otra app (correo, banco, gestor de archivos): abre el importador con el
 * archivo. Solo se monta con sesión; si llega antes del login, el ShareIntentProvider de la raíz lo
 * guarda y se atiende al ingresar. En Expo Go el módulo nativo no existe y nunca hay intent.
 */
function ShareIntentRedirect() {
  const router = useRouter()
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()

  useEffect(() => {
    if (!hasShareIntent) return
    const shared = shareIntent.files?.[0]
    resetShareIntent()
    if (shared?.path) router.navigate({ pathname: '/importar', params: toRouteParams(fileFromShare(shared)) })
  }, [hasShareIntent, shareIntent, resetShareIntent, router])

  return null
}
