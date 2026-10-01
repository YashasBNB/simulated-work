import type { ReactNode } from 'react'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'critical' | 'muted'

const TONES: Record<Tone, string> = {
  neutral: 'border-noc-300 bg-noc-100 text-noc-700',
  muted: 'border-noc-200 bg-white text-noc-500',
  info: 'border-ops-info/25 bg-ops-info-bg text-ops-info',
  success: 'border-ops-healthy/25 bg-ops-healthy-bg text-ops-healthy',
  warning: 'border-ops-warning/25 bg-ops-warning-bg text-ops-warning',
  critical: 'border-ops-critical/25 bg-ops-critical-bg text-ops-critical',
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
  title,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** Small square colour chip for scanning a status column quickly. */
export function StatusDot({ tone, label }: { tone: 'success' | 'warning' | 'critical' | 'neutral'; label: string }) {
  const color =
    tone === 'success'
      ? 'bg-ops-healthy'
      : tone === 'warning'
        ? 'bg-ops-warning'
        : tone === 'critical'
          ? 'bg-ops-critical'
          : 'bg-noc-400'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-1.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

export function DocumentStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  if (normalized === 'active') return <Badge tone="success">Active</Badge>
  if (normalized === 'deprecated') return <Badge tone="critical">Deprecated</Badge>
  return <Badge tone="warning">{status}</Badge>
}

export function FlagStatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Badge tone="warning">Pending</Badge>
    case 'reviewed':
      return <Badge tone="info">Reviewed</Badge>
    case 'resolved':
      return <Badge tone="success">Resolved</Badge>
    case 'dismissed':
      return <Badge tone="neutral">Dismissed</Badge>
    case 'none':
      return <Badge tone="muted">No flag</Badge>
    default:
      return <Badge tone="neutral">{status}</Badge>
  }
}

export function ConfidencePill({
  confidence,
  isConfident,
}: {
  confidence: number
  isConfident: boolean
}) {
  if (!isConfident) {
    return (
      <Badge tone="critical" title="Confidence below the backend SLA threshold">
        No confident answer
      </Badge>
    )
  }
  const pct = (confidence * 100).toFixed(1)
  const tone: Tone = confidence >= 0.7 ? 'success' : confidence >= 0.45 ? 'warning' : 'warning'
  return (
    <Badge tone={tone} title={`Confidence score ${pct}%`}>
      Confidence {pct}%
    </Badge>
  )
}

export function QueryTypeBadge({ type }: { type: string }) {
  return type === 'error_code' ? (
    <Badge tone="info" title="Backend detected an error code in this query">
      Error code
    </Badge>
  ) : (
    <Badge tone="neutral" title="Natural language query">
      Natural language
    </Badge>
  )
}

/** Horizontal confidence meter. Width reflects the real 0..1 score. */
export function ConfidenceMeter({ confidence, isConfident }: { confidence: number; isConfident: boolean }) {
  const pct = Math.max(0, Math.min(1, confidence)) * 100
  const bar = isConfident ? (confidence >= 0.7 ? 'bg-ops-healthy' : 'bg-ops-warning') : 'bg-ops-critical'
  return (
    <div
      className="bg-noc-200 h-1.5 w-full overflow-hidden rounded-full"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(confidence.toFixed(3))}
      aria-label={`Confidence ${(confidence * 100).toFixed(1)} percent`}
    >
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
