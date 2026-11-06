import { useEffect } from 'react'
import { Sprout } from 'lucide-react-native'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { SERVER_WAKING_MESSAGE } from '../brand'
import { useSlow } from '../hooks/useSlow'
import { colors, space, type, useReducedMotion } from '../theme'
import { nativeDriver, useAnimatedValue } from '../theme/motion'

/** Pantalla de espera mientras se recupera la sesión (= Splash de web/src/auth/guards.tsx). */
export function Splash() {
  const reduced = useReducedMotion()
  const pulse = useAnimatedValue(1)
  const slow = useSlow(true)

  useEffect(() => {
    if (reduced) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 900, useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: nativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse, reduced])

  return (
    <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel="Cargando tu sesión">
      <Animated.View style={[styles.badge, { opacity: pulse }]}>
        <Sprout size={30} color={colors.iconOnBrand} />
      </Animated.View>
      {slow && (
        <Text accessibilityLiveRegion="polite" style={[type.bodySm, styles.message]}>
          {SERVER_WAKING_MESSAGE}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space[5], backgroundColor: colors.canvas, padding: space[8] },
  badge: { width: 64, height: 64, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  message: { color: colors.fgMuted, textAlign: 'center', maxWidth: 280 },
})
