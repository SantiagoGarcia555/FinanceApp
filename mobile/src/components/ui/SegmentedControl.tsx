import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, shadows, type } from '../../theme'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  /** Nombre accesible del grupo. */
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Ocupa todo el ancho repartiendo las opciones. */
  stretch?: boolean
  style?: StyleProp<ViewStyle>
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, stretch, style }: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.group, stretch && styles.stretch, style]}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, checked: active }}
            onPress={() => onChange(o.value)}
            style={[styles.option, stretch && styles.flex, active && styles.active]}
          >
            <Text style={[type.labelSm, { color: active ? colors.fg : colors.fgMuted }]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 9999,
    backgroundColor: colors.subtle,
    padding: 4,
  },
  stretch: { alignSelf: 'stretch' },
  option: { alignItems: 'center', justifyContent: 'center', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 10 },
  flex: { flex: 1 },
  active: { backgroundColor: colors.surface, boxShadow: shadows.card },
})
