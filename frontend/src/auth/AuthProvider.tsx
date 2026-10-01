import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getCurrentUser, login as loginRequest } from '../api/auth'
import { isApiError, toErrorMessage, tokenStorage } from '../api/client'
import { AuthContext } from './authContext'
import type { AuthContextValue, AuthStatus } from './authContext'
import type { UserWithRole } from '../types/api'

/**
 * Single owner of the authenticated session: token persistence, `/auth/me`
 * bootstrap, login, logout, and central 401 handling.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStorage.get() ? 'loading' : 'anonymous',
  )
  const [user, setUser] = useState<UserWithRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const refresh = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null)
      setStatus('anonymous')
      return
    }
    try {
      const profile = await getCurrentUser()
      setUser(profile)
      setStatus('authenticated')
    } catch (err) {
      // A dead/invalid token must not leave the app half-authenticated.
      if (isApiError(err) && err.kind === 'unauthorized') {
        tokenStorage.clear()
        setUser(null)
        setStatus('anonymous')
        return
      }
      // Network / server trouble: keep the token but surface the problem.
      setError(toErrorMessage(err, 'Could not verify your session.'))
      setStatus('anonymous')
    }
  }, [])

  // Restore the session on mount when a token is present.
  useEffect(() => {
    if (status !== 'loading') return
    let active = true
    void (async () => {
      if (!active) return
      await refresh()
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Any API call that comes back 401 invalidates the session centrally.
  useEffect(() => {
    const handleUnauthorized = () => {
      tokenStorage.clear()
      setUser(null)
      setStatus('anonymous')
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (email: string) => {
    setError(null)
    const result = await loginRequest(email)
    tokenStorage.set(result.access_token)
    setUser(result.user)
    setStatus('authenticated')
    return result.user
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, login, logout, clearError, refresh }),
    [status, user, error, login, logout, clearError, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
