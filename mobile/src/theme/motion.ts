import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native'

/** Mismas curvas que web/src/styles/motion.css. */
export const easing = {
  /** --ease-out-soft: entradas (rise, anillo, hoja inferior). */
  outSoft: Easing.bezier(0.22, 1, 0.36, 1),
  /** --ease-spring: nav inferior que entra con resorte. */
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const

/** El driver nativo (animación fuera del hilo de JS) no existe en react-native-web. */
export const nativeDriver = Platform.OS !== 'web'

/**
 * `true` si el usuario pidió reducir movimiento (Android: "Quitar animaciones").
 * Equivale a `prefers-reduced-motion` en la web: las animaciones van directo al estado final.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduced(value))
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      active = false
      sub.remove()
    }
  }, [])
  return reduced
}

/**
 * Valor animado estable entre renders. RN trae `useAnimatedValue`, pero react-native-web
 * no lo implementa; este equivale y funciona en ambos (sin leer refs durante el render).
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial))
  return value
}
