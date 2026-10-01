import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { hasCapability, roleLabel } from '../auth/rbac'
import type { Capability } from '../auth/rbac'
import { LoadingState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { TerminalIcon } from '../components/ui/Button'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-noc-100">
      <LoadingState label="Restoring session…" />
    </div>
  )
}

/** Gate for authenticated routes: redirects to /login when anonymous. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <>{children}</>
}

/**
 * Gate for role-scoped routes. Frontend-only UX affordance: the backend
 * re-checks authorization on every request and returns 403 regardless.
 */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability
  children: ReactNode
}) {
  const { user, logout } = useAuth()
  const roleId = user?.role_id ?? ''

  if (!hasCapability(roleId, capability)) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <div className="rounded-lg border border-noc-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2 text-ops-warning">
            <TerminalIcon />
            <h1 className="text-sm font-semibold text-noc-900">Access denied for your role</h1>
          </div>
          <p className="text-sm leading-relaxed text-noc-700">
            Your role{' '}
            <span className="font-semibold">
              {roleLabel(roleId, user?.role?.role_name)}
            </span>{' '}
            is not permitted to open this page. The backend enforces the same rule and would return{' '}
            <code className="bg-noc-100 rounded px-1 py-0.5 font-mono text-xs">403 Forbidden</code>.
          </p>
          <p className="mt-2 text-xs text-noc-500">
            Switch to an account with the required permission, or return to the Incident Assistant.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => window.history.back()}>
              Go back
            </Button>
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
