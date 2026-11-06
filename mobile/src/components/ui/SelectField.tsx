import { useState } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, type, withAlpha } from '../../theme'
import { Sheet } from './Sheet'

export interface SelectOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

export interface SelectFieldProps<T extends string> {
  label: string
  options: SelectOption<T>[]
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
  error?: string
  style?: StyleProp<ViewStyle>
}

/**
 * React Native no trae <select>: el campo se ve como TextField y abre una hoja
 * inferior con las opciones (patrón habitual en Android, cómodo con el pulgar).
 */
export function SelectField<T extends string>({ label, options, value, onChange, placeholder = 'Elegir…', error, style }: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[type.label, { color: colors.fg }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'sin elegir'}`}
        accessibilityHint={error ?? 'Abre la lista de opciones'}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, error ? styles.invalid : null, pressed && styles.pressed]}
      >
        <Text style={[type.body, styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.iconMuted} />
      </Pressable>
      {error && <Text style={[type.bodySm, { color: colors.fgAccent }]}>{error}</Text>}

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <View accessibilityRole="radiogroup">
          {options.map((o) => {
            const active = o.value === value
            const Icon = o.icon
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, selected: active }}
                onPress={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                style={({ pressed }) => [styles.option, (pressed || active) && styles.optionActive]}
              >
                {Icon && (
                  <View style={styles.optionIcon}>
                    <Icon size={18} color={colors.icon} />
                  </View>
                )}
                <Text style={[type.body, styles.value]}>{o.label}</Text>
                {active && <Check size={20} color={colors.iconBrand} />}
              </Pressable>
            )
          })}
        </View>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 12,
  },
  invalid: { borderColor: colors.accent },
  pressed: { borderColor: colors.brand },
  value: { flex: 1, color: colors.fg },
  placeholder: { color: withAlpha(colors.fgMuted, 0.7) },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionActive: { backgroundColor: withAlpha(colors.subtle, 0.6) },
  optionIcon: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.subtle },
})
