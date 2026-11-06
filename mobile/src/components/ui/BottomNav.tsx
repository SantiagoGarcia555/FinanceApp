import { useEffect } from 'react'
import { ChartColumn, House, Plus, User, Wallet, type LucideIcon } from 'lucide-react-native'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, easing, shadows, useReducedMotion } from '../../theme'
import { nativeDriver, useAnimatedValue } from '../../theme/motion'
import { IconButton } from './IconButton'

// Figma › Componentes › Nav inferior: flotante, 4 tabs + FAB central.
export const NAV_TABS = [
  { key: 'inicio', label: 'Inicio', icon: House },
  { key: 'analisis', label: 'Análisis', icon: ChartColumn },
  { key: 'billetera', label: 'Billetera', icon: Wallet },
  { key: 'perfil', label: 'Perfil', icon: User },
] as const satisfies ReadonlyArray<{ key: string; label: string; icon: LucideIcon }>

export type NavTabKey = (typeof NAV_TABS)[number]['key']

/** Alto de la barra + margen: padding inferior que necesita el contenido para no quedar tapado. */
export const BOTTOM_NAV_CLEARANCE = 68 + 24 + 16

export interface BottomNavProps {
  active: NavTabKey
  onTabPress: (key: NavTabKey) => void
  onAdd?: () => void
}

/**
 * Presentacional: no conoce el router. En 1.3.1 se conecta como `tabBar`
 * personalizado de Expo Router (Tabs) pasándole la ruta activa.
 */
export function BottomNav({ active, onTabPress, onAdd }: BottomNavProps) {
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const enter = useAnimatedValue(0)

  useEffect(() => {
    if (reduced) {
      enter.setValue(1)
      return
    }
    const anim = Animated.timing(enter, { toValue: 1, duration: 800, delay: 200, easing: easing.spring, useNativeDriver: nativeDriver })
    anim.start()
    return () => anim.stop()
  }, [enter, reduced])

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [140, 0] })

  const tab = (t: (typeof NAV_TABS)[number]) => {
    const isActive = t.key === active
    const Icon = t.icon
    return (
      <Pressable
        key={t.key}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: isActive }}
        onPress={() => onTabPress(t.key)}
        hitSlop={2}
        style={({ pressed }) => [styles.tab, isActive && styles.tabActive, pressed && !isActive && styles.tabPressed]}
      >
        <Icon size={20} strokeWidth={2} color={isActive ? colors.iconOnBrand : colors.iconMuted} />
      </Pressable>
    )
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.dock, { bottom: Math.max(insets.bottom, 8) + 16, transform: [{ translateY }] }]}
    >
      <View accessibilityRole="tablist" style={styles.bar}>
        {tab(NAV_TABS[0])}
        {tab(NAV_TABS[1])}
        <IconButton icon={Plus} label="Nuevo movimiento" variant="accent" size="lg" onPress={onAdd} />
        {tab(NAV_TABS[2])}
        {tab(NAV_TABS[3])}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: 350,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 9999,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    boxShadow: shadows.card,
  },
  tab: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.brand },
  tabPressed: { backgroundColor: colors.subtle },
})
