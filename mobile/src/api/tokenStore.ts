import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { memoryTokenStore, type TokenStore } from './client'

const KEY = 'finance-app.refresh-token'

/**
 * Refresh token cifrado en el dispositivo: Android Keystore / iOS Keychain vía expo-secure-store.
 * En el preview web (react-native-web, solo desarrollo) SecureStore no existe: queda en memoria
 * y la sesión dura lo que la pestaña.
 */
export const secureTokenStore: TokenStore =
  Platform.OS === 'web'
    ? memoryTokenStore()
    : {
        get: () => SecureStore.getItemAsync(KEY),
        set: (token) => SecureStore.setItemAsync(KEY, token),
        clear: () => SecureStore.deleteItemAsync(KEY),
      }
