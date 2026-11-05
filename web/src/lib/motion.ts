import type { CSSProperties } from 'react'

/** Retardo para las utilidades animate-* (lee la variable CSS --delay). */
export function delay(ms: number): CSSProperties {
  return { '--delay': `${ms}ms` } as CSSProperties
}
