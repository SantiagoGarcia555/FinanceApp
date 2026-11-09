import { useMemo } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ImportScreen } from '../../features/import/ImportScreen'
import { fromRouteParams, type ImportRouteParams } from '../../features/import/importFlow'
import { useTransactions } from '../../features/transactions/TransactionsContext'

/**
 * Importar extracto (= /importar de la web). Se abre desde Perfil o Billetera, o con "Compartir con
 * Tino" (llega con el archivo en los parámetros).
 */
export default function ImportRoute() {
  const router = useRouter()
  const { categories, notifyChanged } = useTransactions()
  const params = useLocalSearchParams<ImportRouteParams>()
  const { uri, name, mimeType, size } = params
  const initialFile = useMemo(() => fromRouteParams({ uri, name, mimeType, size }), [uri, name, mimeType, size])

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

  return (
    <ImportScreen
      // Otro archivo compartido con la pantalla abierta: empieza de cero
      key={initialFile?.uri ?? 'manual'}
      categories={categories}
      initialFile={initialFile}
      onImported={notifyChanged}
      onBack={back}
      onSeeMovements={() => router.navigate('/billetera')}
      onGoHome={() => router.navigate('/')}
    />
  )
}
