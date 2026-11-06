import { ChartColumn } from 'lucide-react-native'
import { Text } from 'react-native'
import { ComingSoon } from '../../components/ComingSoon'
import { Screen } from '../../components/Screen'
import { Rise } from '../../components/ui'
import { colors, type } from '../../theme'

export default function AnalysisScreen() {
  return (
    <Screen withNav>
      <Rise>
        <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
          Análisis
        </Text>
      </Rise>
      <ComingSoon
        icon={ChartColumn}
        title="Gasto por categoría y tendencia"
        message="Muy pronto: en qué se va tu plata cada mes y cómo cambia frente a los meses anteriores."
      />
    </Screen>
  )
}
