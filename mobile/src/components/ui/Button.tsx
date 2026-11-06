import type { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { colors, type, withAlpha } from '../../theme'

// Figma › Componentes › Botón (Estilo × Tamaño)
const variants = {
  /** Acción más importante de la pantalla. */
  primary: { box: { backgroundColor: colors.brand }, fg: colors.fgOnBrand },
  /** Acción dentro de una tarjeta de marca (p. ej. Insight IA). */
  accent: { box: { backgroundColor: colors.progress }, fg: colors.fgBrand },
  /** Acción de soporte. */
  secondary: { box: { borderWidth: 1.5, borderColor: colors.line }, fg: colors.fg },
  /** Secundario sobre fondo bosque. */
  'on-brand': { box: { borderWidth: 1.5, borderColor: withAlpha(colors.lineOnBrand, 0.4) }, fg: colors.fgOnBrand },
} as const

const sizes = {
  md: { box: { gap: 8, paddingHorizontal: 20, paddingVertical: 12, minHeight: 48 }, text: type.label, icon: 18 },
  sm: { box: { gap: 6, paddingHorizontal: 16, paddingVertical: 8, minHeight: 36 }, text: type.labelSm, icon: 16 },
} as const

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: LucideIcon
  /** Muestra un spinner y bloquea el botón (p. ej. mientras se envía un formulario). */
  loading?: boolean
  /** Ocupa todo el ancho disponible. */
  block?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ label, variant = 'primary', size = 'md', icon: Icon, loading, block, disabled, style, ...rest }: ButtonProps) {
  const v = variants[variant]
  const s = sizes[size]
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        v.box,
        s.box,
        block && styles.block,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        Icon && <Icon size={s.icon} strokeWidth={2} color={v.fg} />
      )}
      <View>
        <Text style={[s.text, { color: v.fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 9999, alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  disabled: { opacity: 0.5 },
})
