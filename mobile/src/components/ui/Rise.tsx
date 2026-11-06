import { useEffect, type ReactNode } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'
import { easing, useReducedMotion } from '../../theme'
import { nativeDriver, useAnimatedValue } from '../../theme/motion'

export interface RiseProps {
  children: ReactNode
  /** ms antes de entrar (para escalonar secciones, como `style={delay(300)}` en la web). */
  delay?: number
  /** Distancia desde la que sube (px). */
  from?: number
  style?: StyleProp<ViewStyle>
}

/** Entrada "sube y aparece" (= `animate-rise` de la web). Respeta reducir movimiento. */
export function Rise({ children, delay = 0, from = 24, style }: RiseProps) {
  const reduced = useReducedMotion()
  const progress = useAnimatedValue(0)

  useEffect(() => {
    if (reduced) {
      progress.setValue(1)
      return
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 650,
      delay,
      easing: easing.outSoft,
      useNativeDriver: nativeDriver,
    })
    anim.start()
    return () => anim.stop()
  }, [delay, progress, reduced])

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] })
  return <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>{children}</Animated.View>
}
