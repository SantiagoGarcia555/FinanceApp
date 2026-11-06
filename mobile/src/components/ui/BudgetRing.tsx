import { useEffect, useId } from 'react'
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { colors, easing, fonts, tabularNums, type, useReducedMotion } from '../../theme'
import { useAnimatedValue } from '../../theme/motion'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export interface BudgetRingProps {
  /** 0–100 (el arco se recorta a ese rango; el texto muestra el valor real, p. ej. 110%). */
  percent: number
  /** Texto visible bajo el porcentaje. */
  label?: string
  /** Texto para TalkBack tras el porcentaje (p. ej. "de tus ingresos ya gastado"). */
  description?: string
  size?: number
  /** ms antes de empezar a dibujarse. */
  animationDelay?: number
  style?: StyleProp<ViewStyle>
}

const R = 52
const CIRCUMFERENCE = 2 * Math.PI * R

/** Anillo de presupuesto con degradado sol → terracota que se dibuja al entrar. */
export function BudgetRing({ percent, label = 'usado', description, size = 120, animationDelay = 0, style }: BudgetRingProps) {
  // useId trae ":" que no siempre es válido en url(#…) de SVG
  const gradientId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const value = Math.min(100, Math.max(0, percent))
  const shown = Math.max(0, Math.round(percent))
  const reduced = useReducedMotion()
  const drawn = useAnimatedValue(0)

  useEffect(() => {
    if (reduced) {
      drawn.setValue(value)
      return
    }
    // strokeDashoffset es una prop de SVG: no admite el driver nativo
    const anim = Animated.timing(drawn, {
      toValue: value,
      duration: 1200,
      delay: animationDelay,
      easing: easing.outSoft,
      useNativeDriver: false,
    })
    anim.start()
    return () => anim.stop()
  }, [animationDelay, drawn, reduced, value])

  const dashOffset = drawn.interpolate({ inputRange: [0, 100], outputRange: [CIRCUMFERENCE, 0] })

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${shown}% ${description ?? `del presupuesto ${label}`}`}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" style={styles.rotated}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.progress} />
            <Stop offset="100%" stopColor={colors.accent} />
          </LinearGradient>
        </Defs>
        <Circle cx={60} cy={60} r={R} fill="none" stroke={colors.decor} strokeOpacity={0.7} strokeWidth={12} />
        <AnimatedCircle
          cx={60}
          cy={60}
          r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          // con 0% el extremo redondeado dejaría un punto visible
          strokeOpacity={value === 0 ? 0 : 1}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.percent, tabularNums, percent > 100 && { color: colors.fgAccent }]}>{shown}%</Text>
        <Text style={[type.bodySm, { color: colors.fgMuted }]}>{label}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  rotated: { transform: [{ rotate: '-90deg' }] },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  percent: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.fg },
})
