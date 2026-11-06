import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, space } from '../theme'
import { BOTTOM_NAV_CLEARANCE } from './ui'

export interface ScreenProps {
  children: ReactNode
  /** Deja espacio para la nav flotante (pantallas de las tabs). */
  withNav?: boolean
  contentStyle?: StyleProp<ViewStyle>
}

/** Contenedor de pantalla: fondo crema, scroll, márgenes y áreas seguras (notch, barra de gestos). */
export function Screen({ children, withNav, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space[6], paddingBottom: (withNav ? BOTTOM_NAV_CLEARANCE : 0) + insets.bottom + space[6] },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, paddingHorizontal: space[5], gap: space[6] },
})
