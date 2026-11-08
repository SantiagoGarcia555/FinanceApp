import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { api } from '../../api/client'
import { listTransactions, type TransactionFilters } from '../../api/transactions'
import type { MonthlySummaryResponse, TransactionResponse } from '../../api/types'
import { appendPage } from './movements'

type Status = 'loading' | 'ready' | 'error'

const messageOf = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

/**
 * Lista paginada de movimientos para unos filtros (= MovementsPage de la web, con scroll infinito).
 * - La primera página + el resumen del mes se recargan al cambiar filtros, al guardar un movimiento
 *   (`version`) o al deslizar para actualizar. Mientras tanto la lista anterior sigue visible.
 * - `loadMore` pide la página siguiente; ignora la respuesta si los filtros cambiaron entretanto.
 */
export function useMovements(filters: TransactionFilters, version: number) {
  const [items, setItems] = useState<TransactionResponse[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Sube con cada carga de primera página: invalida un "cargar más" que venía de filtros viejos
  const generation = useRef(0)
  const loadingMoreRef = useRef(false)

  const key = JSON.stringify(filters)

  useEffect(() => {
    const gen = ++generation.current
    const controller = new AbortController()
    const f = JSON.parse(key) as TransactionFilters
    Promise.all([
      listTransactions({ ...f, page: 1 }, controller.signal),
      api<MonthlySummaryResponse>(`/api/dashboard/summary?month=${f.from!.slice(0, 7)}`, { signal: controller.signal }),
    ])
      .then(([result, monthSummary]) => {
        if (controller.signal.aborted || gen !== generation.current) return
        setItems(result.items)
        setPage(1)
        setTotalPages(result.totalPages)
        setTotalCount(result.totalCount)
        setSummary(monthSummary)
        setLoadMoreError(null)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        setError(messageOf(e, 'No pudimos cargar tus movimientos.'))
        setStatus('error')
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false)
      })
    return () => controller.abort()
  }, [key, version, reloadKey])

  const hasMore = status === 'ready' && page < totalPages

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return
    const gen = generation.current
    loadingMoreRef.current = true
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const result = await listTransactions({ ...(JSON.parse(key) as TransactionFilters), page: page + 1 })
      if (gen !== generation.current) return
      setItems((prev) => appendPage(prev, result.items))
      setPage(result.page)
      setTotalPages(result.totalPages)
    } catch (e) {
      if (gen === generation.current) setLoadMoreError(messageOf(e, 'No pudimos cargar más movimientos.'))
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, key, page])

  return {
    items,
    totalCount,
    summary,
    status,
    error,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    refreshing,
    refresh: () => {
      setRefreshing(true)
      setReloadKey((k) => k + 1)
    },
    retry: () => {
      setStatus('loading')
      setReloadKey((k) => k + 1)
    },
  }
}
