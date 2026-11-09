import { useRouter } from 'expo-router'
import { MovementsScreen } from '../../../features/transactions/MovementsScreen'

export default function BilleteraRoute() {
  const router = useRouter()
  return <MovementsScreen onImport={() => router.push('/importar')} />
}
