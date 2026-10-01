import type { ReactNode } from 'react'
import { AlertIcon, Button, RefreshIcon, Spinner } from './Button'

/** Skeleton block for first-load placeholders. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-noc-200 ${className}`} />
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-noc-100 divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-3 ${colIndex === 0 ? 'w-1/3' : colIndex === columns - 1 ? 'w-16' : 'w-1/6'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-12 text-sm text-noc-600 ${className}`}>
      <Spinner />
      <span role="status">{label}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      {icon ? <div className="mb-3 text-noc-400">{icon}</div> : null}
      <p className="text-sm font-semibold text-noc-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-xs leading-relaxed text-noc-600">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

const ERROR_TITLES: Record<string, string> = {
  unauthorized: 'Session expired',
  forbidden: 'Access denied',
  not_found: 'Not found',
  validation: 'Request rejected',
  server: 'Backend error',
  network: 'Backend unreachable',
  unknown: 'Something went wrong',
}

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: string | null
  onRetry?: () => void
  compact?: boolean
}) {
  const kind = (error ?? '').trim()
  return (
    <div
      role="alert"
      className={`border-ops-critical/25 flex flex-col items-start gap-2 rounded-md border ${
        kind === 'network' ? 'border-ops-warning/25 bg-ops-warning-bg' : 'bg-ops-critical-bg'
      } ${compact ? 'px-3 py-2.5' : 'px-4 py-4'}`}
    >
      <div className="flex items-start gap-2">
        <span className={kind === 'network' ? 'text-ops-warning mt-0.5' : 'text-ops-critical mt-0.5'}>
          <AlertIcon />
        </span>
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold ${
              kind === 'network' ? 'text-ops-warning' : 'text-ops-critical'
            }`}
          >
            {kind ? (ERROR_TITLES[kind] ?? 'Request failed') : 'Request failed'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed break-words text-noc-700">{error}</p>
        </div>
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry} className="ml-6">
          <RefreshIcon className="size-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  )
}

/** Full-panel state used at page level. */
export function PageError({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  return (
    <div className="p-5">
      <ErrorState error={error} onRetry={onRetry} />
    </div>
  )
}

export function InlineNotice({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: 'info' | 'success' | 'warning' | 'critical'
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-ops-info/25 bg-ops-info-bg text-ops-info',
    success: 'border-ops-healthy/25 bg-ops-healthy-bg text-ops-healthy',
    warning: 'border-ops-warning/25 bg-ops-warning-bg text-ops-warning',
    critical: 'border-ops-critical/25 bg-ops-critical-bg text-ops-critical',
  }
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  )
}
