import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, shadows, space, type } from '../theme'
import { Rise } from './ui'

/** Tarjeta para secciones que aún no existen en la app (sin datos inventados). */
export function ComingSoon({ icon: Icon, title, message, delay = 120 }: { icon: LucideIcon; title: string; message: string; delay?: number }) {
  return (
    <Rise delay={delay} style={styles.card}>
      <View style={styles.badge}>
        <Icon size={22} color={colors.iconBrand} />
      </View>
      <Text style={[type.h3, { color: colors.fg }]}>{title}</Text>
      <Text style={[type.body, { color: colors.fgMuted }]}>{message}</Text>
    </Rise>
  )
}

const styles = StyleSheet.create({
  card: { gap: space[2], borderRadius: radius.lg, backgroundColor: colors.surface, padding: space[5], boxShadow: shadows.card },
  badge: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSubtle, marginBottom: space[1] },
})
