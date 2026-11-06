import type { LucideIcon } from 'lucide-react-native'
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { colors, shadows } from '../../theme'

// Figma › Componentes › Botón de ícono (Estilo × Tamaño). Acento + lg = FAB.
const variants = {
  surface: { box: { backgroundColor: colors.surface, boxShadow: shadows.card }, fg: colors.icon },
  brand: { box: { backgroundColor: colors.brand }, fg: colors.iconOnBrand },
  accent: { box: { backgroundColor: colors.accent, boxShadow: shadows.fab }, fg: colors.iconOnAccent },
  /** Sin fondo (p. ej. "Cerrar" en la hoja inferior). */
  ghost: { box: {}, fg: colors.iconMuted },
} as const

const sizes = {
  md: { box: 44, icon: 20 },
  lg: { box: 54, icon: 24 },
} as const

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: LucideIcon
  /** Obligatorio: es el nombre accesible del botón (TalkBack lo lee). */
  label: string
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  style?: StyleProp<ViewStyle>
}

export function IconButton({ icon: Icon, label, variant = 'surface', size = 'md', style, ...rest }: IconButtonProps) {
  const v = variants[variant]
  const s = sizes[size]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // 44 px se ve como en Figma; el área táctil llega a los 48 dp que pide Android
      hitSlop={size === 'md' ? 2 : 0}
      style={({ pressed }) => [
        styles.base,
        { width: s.box, height: s.box },
        v.box,
        pressed && styles.pressed,
        rest.disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Icon size={s.icon} strokeWidth={2} color={v.fg} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.92 },
  disabled: { opacity: 0.5 },
})
