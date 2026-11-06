import { useEffect } from 'react'
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, easing, useReducedMotion, withAlpha } from '../../theme'
import { useAnimatedValue } from '../../theme/motion'

const tones = {
  brand: colors.brand,
  progress: colors.progress,
  accent: colors.accent,
  /** Dato informativo sin juicio (p. ej. reparto del gasto por categoría). */
  neutral: withAlpha(colors.fg, 0.75),
} as const

export interface ProgressBarProps {
  /** 0–100; valores mayores se muestran llenos. */
  value: number
  tone?: keyof typeof tones
  /** Nombre accesible, p. ej. "Presupuesto de Alimentación". */
  label: string
  style?: StyleProp<ViewStyle>
}

export function ProgressBar({ value, tone = 'brand', label, style }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const reduced = useReducedMotion()
  const width = useAnimatedValue(0)

  useEffect(() => {
    if (reduced) {
      width.setValue(clamped)
      return
    }
    // `width` no se puede animar con el driver nativo
    const anim = Animated.timing(width, { toValue: clamped, duration: 700, easing: easing.outSoft, useNativeDriver: false })
    anim.start()
    return () => anim.stop()
  }, [clamped, reduced, width])

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={[styles.track, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: tones[tone], width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { height: 8, width: '100%', overflow: 'hidden', borderRadius: 9999, backgroundColor: colors.subtle },
  fill: { height: '100%', borderRadius: 9999 },
})
