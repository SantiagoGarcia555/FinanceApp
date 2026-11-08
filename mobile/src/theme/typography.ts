import type { TextStyle } from 'react-native'

/*
 * Estilos de texto = Text styles de Figma = utilidades `type-*` de la web.
 *
 * En React Native cada peso de una fuente de Google es su propia familia
 * ("Fraunces_600SemiBold"), así que el peso se elige con `fontFamily` y NO con
 * `fontWeight` (en Android, combinar una familia propia con fontWeight puede
 * caer a la fuente del sistema). letterSpacing va en px (em × tamaño).
 */

/** Familias cargadas en `useAppFonts` (los nombres deben coincidir con las claves de useFonts). */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayLight: 'Fraunces_300Light',
  /** Voz de la IA ("Tino te sugiere"). */
  displayItalic: 'Fraunces_400Regular_Italic',
  /** Marca en login/registro. */
  displayBoldItalic: 'Fraunces_600SemiBold_Italic',
  sans: 'DMSans_400Regular',
  sansBold: 'DMSans_700Bold',
} as const

const tabular: TextStyle['fontVariant'] = ['tabular-nums']

export const type = {
  monto: { fontFamily: fonts.display, fontSize: 48, lineHeight: 56, letterSpacing: -1.44, fontVariant: tabular },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.52 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 28, letterSpacing: -0.21 },
  h3: { fontFamily: fonts.display, fontSize: 17, lineHeight: 24 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 25 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.sansBold, fontSize: 14, lineHeight: 20 },
  labelSm: { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>

export type TypeToken = keyof typeof type

/** Para cifras en filas y leyendas (equivale a `tabular-nums`). */
export const tabularNums: TextStyle = { fontVariant: tabular }
