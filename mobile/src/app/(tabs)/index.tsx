import { ChartPie } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../auth/AuthContext'
import { ComingSoon } from '../../components/ComingSoon'
import { Screen } from '../../components/Screen'
import { Avatar, Rise } from '../../components/ui'
import { formatToday } from '../../lib/format'
import { colors, space, type } from '../../theme'

export default function HomeScreen() {
  const { user } = useAuth()
  const firstName = user?.name.trim().split(/\s+/)[0] ?? ''

  return (
    <Screen withNav>
      <Rise style={styles.header}>
        <View style={styles.greeting}>
          <Text style={[type.bodySm, { color: colors.fgMuted }]}>{formatToday()}</Text>
          <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
            Hola, {firstName}
          </Text>
        </View>
        {user && <Avatar name={user.name} />}
      </Rise>
      <ComingSoon
        icon={ChartPie}
        title="Tu resumen del mes"
        message="Aquí vas a ver cuánto llevas gastado, tus presupuestos y la tendencia de los últimos meses. Lo estamos trayendo de la web."
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  greeting: { flex: 1, gap: space[1] },
})
