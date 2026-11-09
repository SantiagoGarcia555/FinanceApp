import { useRouter } from 'expo-router'
import { FundamentosScreen } from '../../screens/FundamentosScreen'

/** Catálogo vivo de la librería (= /fundamentos en la web). Se abre desde Perfil. */
export default function FundamentosRoute() {
  const router = useRouter()
  return <FundamentosScreen onBack={() => router.back()} />
}
