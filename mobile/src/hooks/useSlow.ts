import { useEffect, useState } from 'react'

/**
 * `true` cuando `active` lleva más de `ms` encendido. Sirve para avisar "el servidor está
 * despertando" (Render free tarda ~1 min tras 15 min sin uso) sin mostrarlo en cargas normales.
 */
export function useSlow(active: boolean, ms = 4000): boolean {
  const [slow, setSlow] = useState(false)
  const [prevActive, setPrevActive] = useState(active)
  // Al apagarse, se reinicia durante el render (sin efecto extra)
  if (active !== prevActive) {
    setPrevActive(active)
    if (!active) setSlow(false)
  }
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => setSlow(true), ms)
    return () => clearTimeout(id)
  }, [active, ms])
  return active && slow
}
