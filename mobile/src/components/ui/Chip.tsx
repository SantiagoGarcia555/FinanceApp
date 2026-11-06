import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, type } from '../../theme'

// Figma › Componentes › Chip (Tono). El tono es semántico: color como dato.
const tones = {
  /** A favor: ingresos, mejoras. */
  positive: { bg: colors.brandSubtle, fg: colors.fgBrand, value: colors.fgBrand },
  /** Categorías y datos informativos. */
  neutral: { bg: colors.subtle, fg: colors.fg, value: colors.fgAccent },
  /** Gasto que se dispara. */
  alert: { bg: colors.accentSubtle, fg: colors.fgAccent, value: colors.fgAccent },
  /** Metas y avance. */
  progress: { bg: colors.progressSubtle, fg: colors.fgBrand, value: colors.fgBrand },
} as const

export interface ChipProps {
  tone?: keyof typeof tones
  icon?: LucideIcon
  /** Valor destacado a la derecha, p. ej. "$214k". */
  value?: ReactNode
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function Chip({ tone = 'neutral', icon: Icon, value, children, style }: ChipProps) {
  const t = tones[tone]
  return (
    <View style={[styles.box, { backgroundColor: t.bg }, style]}>
      {Icon && <Icon size={14} strokeWidth={2.25} color={t.fg} />}
      <Text style={[type.labelSm, { color: t.fg }]} numberOfLines={1}>
        {children}
        {value != null && <Text style={{ color: t.value }}> {value}</Text>}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
})
