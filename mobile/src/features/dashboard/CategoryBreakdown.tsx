import { StyleSheet, Text, View } from 'react-native'
import { categoryIcon, ProgressBar } from '../../components/ui'
import { formatCompactMoney } from '../../lib/format'
import { colors, tabularNums, type } from '../../theme'
import type { BreakdownItem } from '../../../../shared/dashboard'

/** US-12: gasto del mes por categoría (top 5 + "Otras"), con su peso sobre el total. */
export function CategoryBreakdown({ items }: { items: BreakdownItem[] }) {
  if (items.length === 0) return null

  return (
    <View style={styles.list}>
      {items.map((c) => {
        const Icon = categoryIcon(c.icon)
        const share = Math.round(c.share)
        return (
          <View key={c.categoryId ?? c.categoryName} style={styles.item}>
            <View
              style={styles.row}
              accessible
              accessibilityLabel={`${c.categoryName}: ${formatCompactMoney(c.total)}, ${share}% del gasto del mes`}
            >
              <View style={styles.icon}>
                <Icon size={16} color={colors.icon} />
              </View>
              <Text style={[type.bodySm, styles.name]} numberOfLines={1}>
                {c.categoryName}
              </Text>
              <Text style={[type.label, tabularNums, { color: colors.fg }]}>{formatCompactMoney(c.total)}</Text>
              <Text style={[type.caption, tabularNums, styles.share]}>{share}%</Text>
            </View>
            <ProgressBar value={c.share} tone="neutral" label={`${c.categoryName}: ${share}% del gasto del mes`} />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  item: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.subtle },
  name: { flex: 1, minWidth: 0, color: colors.fg },
  share: { width: 36, textAlign: 'right', color: colors.fgMuted },
})
