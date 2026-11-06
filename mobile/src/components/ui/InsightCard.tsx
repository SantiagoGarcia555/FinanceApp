import { Sprout } from 'lucide-react-native'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, shadows, type, withAlpha } from '../../theme'
import { Button } from './Button'

// Figma › Componentes › Insight IA. Voz de la IA: Fraunces itálica sobre bosque.
export interface InsightCardProps {
  message: string
  title?: string
  /** "ahora", "hace 2 h"… */
  time?: string
  primaryAction: { label: string; onPress?: () => void }
  secondaryAction?: { label: string; onPress?: () => void }
  style?: StyleProp<ViewStyle>
}

export function InsightCard({ message, title = 'Raíz te sugiere', time, primaryAction, secondaryAction, style }: InsightCardProps) {
  return (
    <View accessibilityLabel={title} style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Sprout size={18} strokeWidth={2} color={colors.iconOnProgress} />
        </View>
        <Text accessibilityRole="header" style={[type.label, styles.title]}>
          {title}
        </Text>
        {time && <Text style={[type.caption, { color: withAlpha(colors.fgOnBrand, 0.6) }]}>{time}</Text>}
      </View>
      <Text style={[type.quote, { color: colors.fgOnBrand }]}>“{message}”</Text>
      <View style={styles.actions}>
        <Button variant="accent" label={primaryAction.label} onPress={primaryAction.onPress} />
        {secondaryAction && <Button variant="on-brand" label={secondaryAction.label} onPress={secondaryAction.onPress} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 12, borderRadius: radius.lg, backgroundColor: colors.brand, padding: 20, boxShadow: shadows.ia },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 30, height: 30, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.progress },
  title: { flex: 1, color: colors.fgOnBrand },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
})
