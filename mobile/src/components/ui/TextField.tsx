import { useState, type ComponentRef, type Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { colors, radius, type, withAlpha } from '../../theme'

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string
  error?: string
  hint?: string
  /** Agrega el botón mostrar/ocultar y oculta el texto. */
  password?: boolean
  style?: StyleProp<ViewStyle>
  /** Para enfocar el campo desde fuera (p. ej. saltar al siguiente con "Siguiente" del teclado). */
  ref?: Ref<ComponentRef<typeof TextInput>>
}

/** Campo de texto con label, ayuda y error accesibles. `password` agrega mostrar/ocultar. */
// React 19: `ref` llega como prop normal, sin forwardRef.
export function TextField({ label, error, hint, password, style, onFocus, onBlur, ref, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const message = error ?? hint

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[type.label, { color: colors.fg }]}>{label}</Text>
      <View>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          // TalkBack lee el error/ayuda como pista del campo (equivale a aria-describedby)
          accessibilityHint={message}
          aria-invalid={error ? true : undefined}
          secureTextEntry={password && !visible}
          placeholderTextColor={withAlpha(colors.fgMuted, 0.7)}
          selectionColor={colors.brand}
          cursorColor={colors.brand}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={[
            type.body,
            styles.input,
            focused && styles.focused,
            error ? styles.invalid : null,
            focused && error ? styles.invalidFocused : null,
            password && styles.withToggle,
          ]}
          {...rest}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ selected: visible }}
            onPress={() => setVisible((v) => !v)}
            style={styles.toggle}
            hitSlop={4}
          >
            {visible ? <EyeOff size={20} color={colors.iconMuted} /> : <Eye size={20} color={colors.iconMuted} />}
          </Pressable>
        )}
      </View>
      {message && <Text style={[type.bodySm, { color: error ? colors.fgAccent : colors.fgMuted }]}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.fg,
  },
  focused: { borderColor: colors.brand, boxShadow: `0 0 0 4px ${withAlpha(colors.brand, 0.1)}` },
  invalid: { borderColor: colors.accent },
  invalidFocused: { boxShadow: `0 0 0 4px ${withAlpha(colors.accent, 0.15)}` },
  withToggle: { paddingRight: 52 },
  toggle: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
