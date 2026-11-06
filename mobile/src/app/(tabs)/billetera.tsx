import { ReceiptText } from 'lucide-react-native'
import { Text } from 'react-native'
import { ComingSoon } from '../../components/ComingSoon'
import { Screen } from '../../components/Screen'
import { Rise } from '../../components/ui'
import { colors, type } from '../../theme'

export default function WalletScreen() {
  return (
    <Screen withNav>
      <Rise>
        <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
          Billetera
        </Text>
      </Rise>
      <ComingSoon
        icon={ReceiptText}
        title="Tus movimientos"
        message="Muy pronto: la lista de tus gastos e ingresos, con filtros y edición, y la importación de extractos desde el teléfono."
      />
    </Screen>
  )
}
