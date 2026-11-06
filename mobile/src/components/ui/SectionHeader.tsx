import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, type } from '../../theme'

export interface SectionHeaderProps {
  title: string
  /** Acción opcional a la derecha ("Ver todo"). La navegación la decide la pantalla. */
  action?: { label: string; onPress: () => void }
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={[type.h2, { color: colors.fg }]}>
        {title}
      </Text>
      {action && (
        <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={12}>
          {({ pressed }) => (
            <Text style={[type.label, { color: colors.fgAccent }, pressed && styles.pressed]}>{action.label}</Text>
          )}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  pressed: { opacity: 0.6 },
})
