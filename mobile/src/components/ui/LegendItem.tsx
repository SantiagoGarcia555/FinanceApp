import { StyleSheet, Text, View } from 'react-native'
import { colors, tabularNums, type, withAlpha } from '../../theme'

const dots = {
  accent: colors.accent,
  progress: colors.progress,
  brand: colors.brand,
} as const

export type LegendTone = keyof typeof dots

export interface LegendItemProps {
  tone: LegendTone
  label: string
  value: string
}

export function LegendItem({ tone, label, value }: LegendItemProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.dot, { backgroundColor: dots[tone] }]} />
      <Text style={[type.bodySm, styles.label]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[type.label, tabularNums, { color: colors.fg }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 9999 },
  label: { flex: 1, minWidth: 0, color: withAlpha(colors.fg, 0.8) },
})
