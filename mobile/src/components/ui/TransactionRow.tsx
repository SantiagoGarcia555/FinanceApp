import type { LucideIcon } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { formatMoney } from '../../lib/format'
import { colors, tabularNums, type, withAlpha } from '../../theme'

// Figma › Componentes › Fila de movimiento (Tipo = Gasto | Ingreso, derivado del signo).
export interface TransactionRowProps {
  title: string
  detail: string
  /** Con signo: negativo = gasto, positivo = ingreso. */
  amount: number
  icon: LucideIcon
  /** Si se pasa, la fila se puede tocar (p. ej. para editar el movimiento). */
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function TransactionRow({ title, detail, amount, icon: Icon, onPress, style }: TransactionRowProps) {
  const income = amount > 0
  const money = formatMoney(amount, { signed: true })
  // TalkBack lee la fila como una sola unidad: "Almuerzo, Comida · Hoy, Gasto de $38.900"
  const a11yLabel = `${title}, ${detail}, ${income ? 'Ingreso' : 'Gasto'} de ${formatMoney(Math.abs(amount))}`

  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: income ? colors.brandSubtle : colors.subtle }]}>
        <Icon size={20} strokeWidth={2} color={income ? colors.iconBrand : colors.icon} />
      </View>
      <View style={styles.texts}>
        <Text style={[type.label, { color: colors.fg }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[type.bodySm, { color: colors.fgMuted }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={[type.label, tabularNums, { color: income ? colors.fgBrand : colors.fg }]}>{money}</Text>
    </>
  )

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={a11yLabel} style={[styles.row, style]}>
        {content}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Abre el movimiento para editarlo"
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.pressable, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pressable: { marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 20 },
  pressed: { backgroundColor: withAlpha(colors.subtle, 0.6) },
  icon: { width: 42, height: 42, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0, gap: 2 },
})
