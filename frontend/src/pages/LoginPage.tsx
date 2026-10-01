import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { DEMO_ACCOUNTS } from '../auth/demoAccounts'
import { roleLabel } from '../auth/rbac'
import { isApiError, toErrorMessage } from '../api/client'
import { Button, TerminalIcon } from '../components/ui/Button'
import { InlineNotice } from '../components/ui/States'

/**
 * Shown when the API cannot be reached at all (backend down, or the Vite proxy
 * has no upstream). Sign-in cannot possibly succeed, so explain the fix instead
 * of implying a credential problem.
 */
function BackendUnavailable({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border-ops-warning/30 bg-ops-warning-bg rounded-md border px-3 py-2.5"
    >
      <p className="text-ops-warning text-xs font-semibold">Backend unreachable</p>
      <p className="text-noc-700 mt-1 text-xs leading-relaxed">{message}</p>
      <pre className="bg-noc-900 mt-2 overflow-x-auto rounded border border-noc-800 p-2 font-mono text-[11px] leading-relaxed text-noc-50">
        {`cd backend
pip install -r requirements.txt
pip install pydantic-settings email-validator
PYTHONPATH=. uvicorn app.main:app --port 8000`}
      </pre>
      <p className="text-noc-600 mt-2 text-[11px] leading-relaxed">
        <code className="bg-noc-100 rounded px-1 font-mono">pydantic-settings</code> and{' '}
        <code className="bg-noc-100 rounded px-1 font-mono">email-validator</code> are missing from{' '}
        <code className="bg-noc-100 rounded px-1 font-mono">backend/requirements.txt</code>, so the
        backend will not start without them. Verify with{' '}
        <code className="bg-noc-100 rounded px-1 font-mono">curl localhost:8000/health</code>.
      </p>
    </div>
  )
}

/**
 * Email-only sign-in. POST /api/v1/auth/login takes `{ email }` and returns a
 * bearer token plus the resolved user and role. The backend returns 404 for an
 * unknown address, which we surface as "no account for this address".
 */
export function LoginPage() {
  const { login, status, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [localErrorValue, setLocalErrorValue] = useState<unknown>(null)

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/assistant'} replace />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) {
      setLocalError('Enter your work email address.')
      return
    }
    setLocalError(null)
    setLocalErrorValue(null)
    clearError()
    setPending(true)
    try {
      await login(value)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/assistant', { replace: true })
    } catch (err) {
      setLocalError(toErrorMessage(err, 'Sign-in failed.'))
      setLocalErrorValue(err)
    } finally {
      setPending(false)
    }
  }

  const message = localError ?? error
  // Any transport-level failure means sign-in cannot work, whatever the cause.
  const isBackendDown =
    (localErrorValue !== null && isApiError(localErrorValue) && localErrorValue.kind === 'network') ||
    (!localError && error !== null && /cannot reach|unable to reach|dev proxy/i.test(error))

  return (
    <div className="flex min-h-screen items-center justify-center bg-noc-100 px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="grid overflow-hidden rounded-xl border border-noc-200 bg-white shadow-sm md:grid-cols-[1.1fr_1fr]">
          {/* Brand / context panel */}
          <div className="bg-noc-900 flex flex-col justify-between px-6 py-7 text-noc-100 sm:px-8">
            <div>
              <div className="flex items-center gap-2">
                <TerminalIcon className="text-ops-info size-5" />
                <span className="text-sm font-semibold tracking-tight text-noc-50">
                  Incident Assistant
                </span>
              </div>
              <h1 className="mt-6 text-xl leading-snug font-semibold tracking-tight text-white sm:text-2xl">
                Source-cited troubleshooting for live telecom incidents.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-noc-300">
                Ask a question or paste an error code. Answers are grounded strictly in authorized,
                non-deprecated runbooks — or the assistant tells you it has no confident answer.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  'Hybrid keyword + vector retrieval with error-code boost',
                  'Every confident answer cites document, version and section',
                  'RBAC-filtered to the runbook categories your role may read',
                  'Full audit trail of queries, uploads and flag reviews',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-xs leading-relaxed text-noc-300">
                    <span className="bg-ops-info mt-1.5 size-1.5 shrink-0 rounded-full" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-8 text-[11px] leading-relaxed text-noc-500">
              Mission-critical incident &amp; runbook platform. Authorization is enforced by the
              backend API and retrieval layer.
            </p>
          </div>

          {/* Sign-in form */}
          <div className="px-6 py-7 sm:px-8">
            <h2 className="text-sm font-semibold tracking-tight text-noc-900">Sign in</h2>
            <p className="mt-1 text-xs leading-relaxed text-noc-600">
              Authenticate with your work email. No password — this platform expects internal SSO.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="login-email" className="text-xs font-medium text-noc-700">
                  Work email<span className="text-ops-critical ml-0.5">*</span>
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.internal"
                  autoComplete="username"
                  required
                  aria-invalid={message ? true : undefined}
                  className={`focus:border-ops-info h-10 w-full rounded-md border bg-white px-3 text-sm text-noc-900 placeholder:text-noc-400 ${
                    message ? 'border-ops-critical' : 'border-noc-300'
                  }`}
                />
              </div>

              {message ? (
                isBackendDown ? (
                  <BackendUnavailable message={message} />
                ) : (
                  <InlineNotice tone="critical">
                    {message.includes('not found')
                      ? 'No account exists for that address. Use one of the demo identities below.'
                      : message}
                  </InlineNotice>
                )
              ) : null}

              <Button
                type="submit"
                variant="primary"
                loading={pending}
                loadingLabel="Signing in…"
                className="w-full"
              >
                Sign in
              </Button>
            </form>

            <div className="border-noc-200 mt-6 border-t pt-4">
              <p className="text-noc-500 text-[11px] font-semibold tracking-wider uppercase">
                Demo identities
              </p>
              <p className="text-noc-500 mt-1 text-[11px] leading-relaxed">
                Seeded by the backend. Each role sees a different navigation set.
              </p>
              <ul className="mt-2.5 space-y-1">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(account.email)
                        setLocalError(null)
                      }}
                      className="border-noc-200 hover:bg-noc-50 flex w-full items-center justify-between gap-2 rounded-md border bg-white px-2.5 py-1.5 text-left transition-colors"
                    >
                      <span className="font-mono text-[11px] break-all text-noc-800">
                        {account.email}
                      </span>
                      <span className="text-noc-500 shrink-0 text-[10px]">
                        {roleLabel(account.roleId)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
