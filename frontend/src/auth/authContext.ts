import { createContext, useContext } from 'react'
import type { UserWithRole } from '../types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: UserWithRole | null
  /** Transient bootstrap/login failure, surfaced by the login screen. */
  error: string | null
  login: (email: string) => Promise<UserWithRole>
  logout: () => void
  clearError: () => void
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Convenience: the role id string, or '' while anonymous. */
export function useRoleId(): string {
  const { user } = useAuth()
  return user?.role_id ?? ''
}
