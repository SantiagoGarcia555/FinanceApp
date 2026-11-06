import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react-native'
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, easing, overlay, radius, shadows, type, useReducedMotion } from '../../theme'
import { nativeDriver, useAnimatedValue } from '../../theme/motion'
import { IconButton } from './IconButton'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Hoja inferior modal (bottom sheet) sobre <Modal> de React Native.
 * - El botón "atrás" de Android cierra (onRequestClose).
 * - Tocar el fondo cierra.
 * - Sube con la misma curva que la web (420 ms, ease-out-soft) y se aparta del teclado.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const reduced = useReducedMotion()
  const progress = useAnimatedValue(0)
  // El Modal sigue montado mientras corre la animación de salida
  const [mounted, setMounted] = useState(open)
  // Ajuste de estado al cambiar la prop, durante el render (patrón recomendado por React, sin efecto extra)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reduced ? 1 : open ? 420 : 220,
      easing: easing.outSoft,
      useNativeDriver: nativeDriver,
    })
    anim.start(({ finished }) => finished && !open && setMounted(false))
    return () => anim.stop()
  }, [open, progress, reduced])

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] })

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        {/* Solo para el dedo: TalkBack ya tiene la X y el botón atrás (evita un "Cerrar" duplicado) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} importantForAccessibility="no" tabIndex={-1} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexEnd} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[styles.panel, { maxHeight: height * 0.92, transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[type.h2, styles.title]}>
              {title}
            </Text>
            <IconButton icon={X} label="Cerrar" variant="ghost" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: overlay },
  flexEnd: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    boxShadow: shadows.card,
  },
  handle: { alignSelf: 'center', width: 40, height: 6, borderRadius: 9999, backgroundColor: colors.decor, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  title: { flex: 1, color: colors.fg },
})
