import type { ReactNode } from 'react'
import { Sprout } from 'lucide-react-native'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BRAND_NAME } from '../../brand'
import { Rise } from '../../components/ui'
import { colors, fonts, radius, shadows, space, type, withAlpha } from '../../theme'

/** Marco de login/registro (= web/src/features/auth/AuthLayout.tsx). */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Formas orgánicas de fondo (como la web), solo decorativas */}
      <View pointerEvents="none" style={[styles.blob, styles.blobTop]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottom]} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[8] }]}
      >
        <Rise delay={50} style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Sprout size={26} color={colors.progress} />
            </View>
            <Text style={styles.brandName} accessibilityRole="header">
              {BRAND_NAME}
            </Text>
          </View>
          <View style={styles.titles}>
            <Text style={[type.h1, { color: colors.fg }]}>{title}</Text>
            <Text style={[type.body, { color: colors.fgMuted }]}>{subtitle}</Text>
          </View>
        </Rise>

        <Rise delay={200} style={styles.card}>
          {children}
        </Rise>

        <Rise delay={350} style={styles.footer}>
          {footer}
        </Rise>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[type.bodySm, styles.formError]}>
      {message}
    </Text>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobTop: { top: -128, right: -96, width: 320, height: 320, backgroundColor: withAlpha(colors.decor, 0.85), transform: [{ scaleX: 1.1 }, { rotate: '18deg' }] },
  blobBottom: { bottom: -96, left: -112, width: 288, height: 288, backgroundColor: withAlpha(colors.accent, 0.1) },
  content: { flexGrow: 1, justifyContent: 'center', gap: space[8], paddingHorizontal: space[5], width: '100%', maxWidth: 420, alignSelf: 'center' },
  header: { gap: space[5] },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  brandBadge: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  brandName: { fontFamily: fonts.displayBoldItalic, fontSize: 36, lineHeight: 42, color: colors.fg },
  titles: { gap: space[1] },
  card: { borderRadius: radius.xl, backgroundColor: colors.surface, padding: space[6], boxShadow: shadows.card, gap: space[4] },
  footer: { alignItems: 'center' },
  formError: { borderRadius: radius.sm, backgroundColor: colors.accentSubtle, color: colors.fgAccent, paddingHorizontal: space[4], paddingVertical: space[3] },
})
