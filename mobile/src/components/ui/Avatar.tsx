import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, type } from '../../theme'

/** "Santiago García" → "SG" */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ name, size = 44, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[styles.box, { width: size, height: size }, style]}
    >
      <Text style={[type.label, { color: colors.fgOnAccent }]}>{initialsOf(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', borderRadius: 9999, backgroundColor: colors.accent },
})
