import { useState } from 'react'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { LayoutGrid, LogOut } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { getBaseUrl } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Screen } from '../../components/Screen'
import { Avatar, Button, Rise } from '../../components/ui'
import { colors, radius, shadows, space, type } from '../../theme'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  return (
    <Screen withNav>
      <Rise>
        <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
          Perfil
        </Text>
      </Rise>

      {user && (
        <Rise delay={80} style={[styles.card, styles.identity]}>
          <Avatar name={user.name} size={56} />
          <View style={styles.texts}>
            <Text style={[type.h3, { color: colors.fg }]} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={[type.bodySm, { color: colors.fgMuted }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </Rise>
      )}

      <Rise delay={160} style={styles.actions}>
        <Button variant="secondary" icon={LayoutGrid} label="Catálogo de componentes" block onPress={() => router.push('/fundamentos')} />
        <Button
          variant="primary"
          icon={LogOut}
          label="Cerrar sesión"
          block
          loading={leaving}
          onPress={async () => {
            setLeaving(true)
            await logout() // el guard del layout raíz vuelve a /ingresar
          }}
        />
      </Rise>

      <Text style={[type.caption, styles.meta]}>
        Versión {Constants.expoConfig?.version ?? '—'} · {getBaseUrl().replace(/^https?:\/\//, '')}
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, padding: space[5], boxShadow: shadows.card },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  actions: { gap: space[3] },
  meta: { color: colors.fgMuted, textAlign: 'center' },
})
