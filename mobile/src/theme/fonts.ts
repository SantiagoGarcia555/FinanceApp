import { useFonts } from 'expo-font'
// Import por subruta (un archivo por cara): el índice del paquete hace require de los
// 18 pesos y Metro los metería todos al bundle (~2.8 MB de fuentes que no se usan).
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular'
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold'
import { Fraunces_300Light } from '@expo-google-fonts/fraunces/300Light'
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold'
import { Fraunces_600SemiBold_Italic } from '@expo-google-fonts/fraunces/600SemiBold_Italic'
import { fonts } from './typography'

// Las claves son los nombres de familia que usan los estilos (`fonts.*`).
const faces = {
  [fonts.display]: Fraunces_600SemiBold,
  [fonts.displayLight]: Fraunces_300Light,
  [fonts.displayItalic]: Fraunces_400Regular_Italic,
  [fonts.displayBoldItalic]: Fraunces_600SemiBold_Italic,
  [fonts.sans]: DMSans_400Regular,
  [fonts.sansBold]: DMSans_700Bold,
}

/**
 * Carga las 6 caras que usa la identidad. Funciona en Expo Go (no requiere build nativo).
 * Devuelve [cargadas, error]; si falla, la app sigue con la fuente del sistema.
 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(faces)
}
