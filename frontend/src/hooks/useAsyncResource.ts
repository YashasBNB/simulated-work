import { useCallback, useEffect, useRef, useState } from 'react'
import { isApiError, toErrorMessage } from '../api/client'

export interface AsyncResource<T> {
  data: T | null
  error: string | null
  /** True only for the very first load; keeps tables from flashing on refresh. */
  loading: boolean
  /** True while any load is in flight, including background refreshes. */
  refreshing: boolean
  reload: () => void
  setData: (updater: T | ((current: T | null) => T | null)) => void
}

/**
 * Data-fetching hook with explicit loading / refreshing / error state and
 * request cancellation. Pages stay declarative; no fetching in components.
 */
export function useAsyncResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: { enabled?: boolean } = {},
): AsyncResource<T> {
  const enabled = options.enabled ?? true
  const [data, setDataState] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnce = useRef(false)
  const [reloadToken, setReloadToken] = useState(0)

  // Keep the loader in a ref so an inline arrow's changing identity does not
  // retrigger the effect. Declared before the fetch effect so it is updated first.
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const controller = new AbortController()
    let active = true

    if (hasLoadedOnce.current) setRefreshing(true)
    else setLoading(true)

    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return
        setDataState(result)
        setError(null)
        hasLoadedOnce.current = true
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === 'AbortError')) return
        setError(toErrorMessage(err, 'Failed to load data.'))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadToken])

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  const setData = useCallback((updater: T | ((current: T | null) => T | null)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: T | null) => T | null)(current) : updater,
    )
  }, [])

  return { data, error, loading, refreshing, reload, setData }
}

export interface MutationState<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | null>
  pending: boolean
  error: string | null
  /** True when the failure was a 403 (wrong role) rather than a real error. */
  forbidden: boolean
  reset: () => void
}

/** Small mutation helper for POST actions: submit feedback, upload, review, deprecate. */
export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): MutationState<TArgs, TResult> {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const actionRef = useRef(action)
  useEffect(() => {
    actionRef.current = action
  })

  const reset = useCallback(() => {
    setError(null)
    setForbidden(false)
  }, [])

  const run = useCallback(async (...args: TArgs): Promise<TResult | null> => {
    setPending(true)
    setError(null)
    setForbidden(false)
    try {
      const result = await actionRef.current(...args)
      return result
    } catch (err) {
      if (mounted.current) {
        setError(toErrorMessage(err, 'Action failed.'))
        setForbidden(isApiError(err) && err.kind === 'forbidden')
      }
      return null
    } finally {
      if (mounted.current) setPending(false)
    }
  }, [])

  return { run, pending, error, forbidden, reset }
}
