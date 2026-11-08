import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ApiError } from '../../api'
import { loadDashboard, type DashboardData } from './dashboardData'

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardData; /** El último "actualizar" falló; se muestran los datos anteriores. */ refreshError: string | null }

/** Al volver a la pestaña o a la app, se recarga en silencio si los datos tienen más de esto. */
const STALE_MS = 60_000

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : 'No pudimos cargar tu resumen.')

/**
 * Estado del dashboard: carga inicial, "desliza para actualizar" y recarga silenciosa al volver
 * (los datos pueden haber cambiado desde la web u otro dispositivo).
 * Mismo patrón que la web: cada recarga sube `reloadKey` y el efecto hace la petición.
 */
export function useDashboard(
  /** Sube al crear/editar/eliminar un movimiento (TransactionsContext): recarga sin esqueleto. */
  version = 0,
) {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const loadedAt = useRef(0)
  const inFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    inFlight.current = true
    loadDashboard(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        loadedAt.current = Date.now()
        setState({ status: 'ready', data, refreshError: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // Si ya había datos, se conservan y solo se avisa
        setState((prev) =>
          prev.status === 'ready' ? { ...prev, refreshError: messageOf(error) } : { status: 'error', message: messageOf(error) },
        )
      })
      .finally(() => {
        if (controller.signal.aborted) return
        inFlight.current = false
        setRefreshing(false)
      })
    return () => controller.abort()
  }, [reloadKey, version])

  const reloadIfStale = useCallback(() => {
    if (loadedAt.current && !inFlight.current && Date.now() - loadedAt.current > STALE_MS) setReloadKey((k) => k + 1)
  }, [])

  useFocusEffect(reloadIfStale)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => next === 'active' && reloadIfStale())
    return () => sub.remove()
  }, [reloadIfStale])

  return {
    state,
    refreshing,
    refresh: () => {
      setRefreshing(true)
      setReloadKey((k) => k + 1)
    },
    retry: () => {
      setState({ status: 'loading' })
      setReloadKey((k) => k + 1)
    },
  }
}
