/** Backend timestamps are naive UTC (FastAPI `datetime.utcnow()`) with no offset. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const normalized = /[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}

const TIME_ONLY: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}

/** "01 Oct 2026, 08:35:12" */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', { ...DATE_TIME, timeZone: 'UTC' }).format(date)
}

/** "08:35:12" */
export function formatTime(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-GB', { ...TIME_ONLY, timeZone: 'UTC' }).format(date)
}

/** Compact relative age, e.g. "3m ago". Falls back to an absolute UTC stamp. */
export function formatRelative(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  const deltaSeconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (deltaSeconds < 45) return 'just now'
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
  ]
  let amount = deltaSeconds
  for (const [unit, size] of units) {
    if (Math.abs(amount) < size) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round(amount), unit)
    }
    amount /= size
  }
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    -Math.round(amount),
    'year',
  )
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/** Backend relevance/confidence values are 0..1 fractions. */
export function formatPercent(fraction: number | null | undefined, digits = 0): string {
  if (fraction === null || fraction === undefined) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

/** Analytics percentages are already 0..100. */
export function formatPercentValue(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes.toFixed(minutes % 1 === 0 ? 0 : 1)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function truncate(value: string, max = 120): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}
