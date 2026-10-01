import { getAnalyticsOverview } from '../api/analytics'
import { useAsyncResource } from '../hooks/useAsyncResource'
import {
  formatLatency,
  formatMinutes,
  formatNumber,
  formatPercentValue,
} from '../lib/format'
import type { AnalyticsOverview } from '../types/api'
import { Card, CardBody, CardHeader, PageHeader } from '../components/ui/Card'
import { Button, ChartIcon, DocumentIcon, FlagIcon, RefreshIcon, TerminalIcon } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState, InlineNotice, LoadingState, PageError } from '../components/ui/States'
import { DataTable } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'

/** SLA target from `backend/app/config.py::P95_SLA_SECONDS`. */
const P95_SLA_MS = 5000

/**
 * NOC analytics. Every figure comes from GET /api/v1/analytics/overview.
 * Nothing is computed client-side that the backend does not already provide.
 */
export function AnalyticsPage() {
  const analytics = useAsyncResource<AnalyticsOverview>((signal) => getAnalyticsOverview(signal), [])
  const data = analytics.data

  // Share of documents still eligible for incident search (active vs deprecated).
  const activeShare =
    data && data.document_stats.total_documents > 0
      ? (data.document_stats.active_documents / data.document_stats.total_documents) * 100
      : 0

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Operational metrics aggregated by the backend: query performance, documentation health, feedback and documentation gaps."
        actions={
          <Button variant="secondary" onClick={analytics.reload} loading={analytics.refreshing}>
            <RefreshIcon className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="px-5 py-4">
        {analytics.loading ? (
          <Card>
            <LoadingState label="Loading analytics overview…" />
          </Card>
        ) : analytics.error ? (
          <Card>
            <PageError error={analytics.error} onRetry={analytics.reload} />
          </Card>
        ) : data ? (
          <div className="space-y-4">
            {/* Performance */}
            <section aria-labelledby="analytics-performance">
              <h2
                id="analytics-performance"
                className="text-noc-500 mb-2 text-[11px] font-semibold tracking-wider uppercase"
              >
                Incident response performance
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatTile
                  label="Total queries"
                  value={formatNumber(data.performance.total_queries)}
                  icon={<TerminalIcon />}
                />
                <StatTile
                  label="Average latency"
                  value={formatLatency(data.performance.avg_latency_ms)}
                  icon={<ChartIcon />}
                />
                <StatTile
                  label="P95 latency"
                  value={formatLatency(data.performance.p95_latency_ms)}
                  icon={<ChartIcon />}
                  status={
                    data.performance.p95_latency_ms > P95_SLA_MS ? 'critical' : 'success'
                  }
                  hint={data.performance.p95_latency_ms > P95_SLA_MS
                    ? 'Above the 5s SLA target'
                    : 'Within the 5s SLA target'}
                />
                <StatTile
                  label="Confident answers"
                  value={formatPercentValue(data.performance.confident_percentage)}
                  icon={<ChartIcon />}
                  status={
                    data.performance.confident_percentage >= 80
                      ? 'success'
                      : data.performance.confident_percentage >= 50
                        ? 'warning'
                        : 'critical'
                  }
                />
                <StatTile
                  label="Est. MTTR saved"
                  value={formatMinutes(data.performance.estimated_mttr_saved_minutes)}
                  icon={<ChartIcon />}
                  hint="Backend estimate at 25 min per confident answer"
                />
              </div>
            </section>

            {/* Document + feedback health */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Documentation health"
                  description="Indexed runbook inventory"
                  icon={<DocumentIcon />}
                  actions={
                    <Badge tone="neutral">
                      {formatNumber(data.document_stats.total_chunks)} chunks
                    </Badge>
                  }
                />
                <CardBody className="flex h-full flex-col">
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Stat label="Total" value={formatNumber(data.document_stats.total_documents)} />
                    <Stat
                      label="Active"
                      value={formatNumber(data.document_stats.active_documents)}
                      tone="text-ops-healthy"
                    />
                    <Stat
                      label="Deprecated"
                      value={formatNumber(data.document_stats.deprecated_documents)}
                      tone="text-ops-critical"
                    />
                  </dl>

                  {/* Active vs deprecated split, straight from the backend counts. */}
                  <div className="mt-4">
                    <div className="text-noc-500 mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-medium tracking-wide uppercase">
                        Active vs deprecated
                      </span>
                      <span className="tabular">
                        {data.document_stats.total_documents > 0
                          ? `${activeShare.toFixed(0)}% searchable`
                          : '—'}
                      </span>
                    </div>
                    <div className="bg-noc-200 flex h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-ops-healthy h-full"
                        style={{ width: `${activeShare}%` }}
                        title={`${data.document_stats.active_documents} active`}
                      />
                      <div
                        className="bg-ops-critical h-full"
                        style={{ width: `${100 - activeShare}%` }}
                        title={`${data.document_stats.deprecated_documents} deprecated`}
                      />
                    </div>
                  </div>

                  <div className="border-noc-100 mt-auto flex items-baseline justify-between gap-2 border-t pt-3">
                    <span className="text-noc-500 text-[11px] font-medium tracking-wide uppercase">
                      Indexed chunks
                    </span>
                    <span className="tabular text-lg font-semibold text-noc-900">
                      {formatNumber(data.document_stats.total_chunks)}
                    </span>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Answer feedback"
                  description="Engineer ratings and SME flag throughput"
                  icon={<FlagIcon />}
                />
                <CardBody>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat
                      label="Helpful"
                      value={formatPercentValue(data.feedback_summary.helpful_percentage)}
                      tone="text-ops-healthy"
                    />
                    <Stat label="Helpful votes" value={formatNumber(data.feedback_summary.helpful_count)} />
                    <Stat
                      label="Unhelpful votes"
                      value={formatNumber(data.feedback_summary.unhelpful_count)}
                      tone="text-ops-critical"
                    />
                    <Stat label="Total ratings" value={formatNumber(data.feedback_summary.total_ratings)} />
                  </dl>
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-noc-100 pt-3">
                    <Stat label="Flags raised" value={formatNumber(data.feedback_summary.total_flags)} />
                    <Stat
                      label="Pending"
                      value={formatNumber(data.feedback_summary.pending_flags)}
                      tone="text-ops-warning"
                    />
                    <Stat
                      label="Resolved"
                      value={formatNumber(data.feedback_summary.resolved_flags)}
                      tone="text-ops-healthy"
                    />
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Top error codes */}
            <Card>
              <CardHeader
                title="Top queried error codes"
                description="Detected by the backend's error-code extractor"
                icon={<TerminalIcon />}
                actions={<Badge tone="neutral">{data.top_error_codes.length}</Badge>}
              />
              {data.top_error_codes.length === 0 ? (
                <EmptyState
                  compact
                  title="No error codes detected yet"
                  description="Error-code statistics appear once queries containing codes such as CrashLoopBackOff or HTTP 504 have been run."
                />
              ) : (
                <DataTable
                  caption="Most queried error codes with resolution counts"
                  dense
                  columns={errorCodeColumns}
                  rows={data.top_error_codes}
                  rowKey={(row) => row.error_code}
                />
              )}
            </Card>

            {/* Documentation gaps */}
            <Card>
              <CardHeader
                title="Documentation gaps"
                description="Queries that produced no confident answer — candidates for new or updated runbooks"
                icon={<DocumentIcon />}
                actions={
                  <Badge tone={data.documentation_gaps.length > 0 ? 'warning' : 'success'}>
                    {data.documentation_gaps.length}
                  </Badge>
                }
              />
              {data.documentation_gaps.length === 0 ? (
                <EmptyState
                  compact
                  title="No documentation gaps"
                  description="Every recorded query was answered above the confidence threshold."
                  icon={<ChartIcon className="size-6" />}
                />
              ) : (
                <ul className="divide-y divide-noc-100">
                  {data.documentation_gaps.map((gap) => (
                    <li key={`${gap.query_text}-${gap.last_queried_at}`} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs break-words text-noc-900">{gap.query_text}</p>
                        <p className="text-noc-500 mt-0.5 text-[11px]">
                          Last queried {gap.last_queried_at}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={gap.query_type === 'error_code' ? 'info' : 'neutral'}>
                          {gap.query_type === 'error_code' ? 'Error code' : 'Natural language'}
                        </Badge>
                        <Badge
                          tone={gap.unresolved_count > 2 ? 'critical' : 'warning'}
                          title="Unresolved occurrences"
                        >
                          {gap.unresolved_count} unresolved
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {data.documentation_gaps.length > 0 ? (
                <CardBody>
                  <InlineNotice tone="info">
                    High-volume gaps are the fastest route to reducing repeat escalations: author or
                    update a runbook so these queries clear the 0.35 confidence threshold.
                  </InlineNotice>
                </CardBody>
              ) : null}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const errorCodeColumns: Column<AnalyticsOverview['top_error_codes'][number]>[] = [
  {
    key: 'code',
    header: 'Error code',
    cell: (row) => (
      <span className="font-mono text-xs break-all text-noc-900">{row.error_code}</span>
    ),
  },
  {
    key: 'count',
    header: 'Queries',
    cell: (row) => <span className="tabular text-xs text-noc-800">{formatNumber(row.count)}</span>,
  },
  {
    key: 'resolved',
    header: 'Resolved',
    cell: (row) => (
      <span className="tabular text-xs text-ops-healthy">{formatNumber(row.resolved_count)}</span>
    ),
  },
  {
    key: 'rate',
    header: 'Resolution rate',
    cell: (row) => {
      const rate = row.count > 0 ? (row.resolved_count / row.count) * 100 : 0
      return (
        <div className="flex min-w-32 items-center gap-2">
          <div className="bg-noc-200 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${
                rate >= 80 ? 'bg-ops-healthy' : rate >= 50 ? 'bg-ops-warning' : 'bg-ops-critical'
              }`}
              style={{ width: `${Math.min(100, rate)}%` }}
            />
          </div>
          <span className="tabular w-12 text-right text-xs text-noc-700">{rate.toFixed(0)}%</span>
        </div>
      )
    },
  },
]

type StatTone = 'text-ops-healthy' | 'text-ops-critical' | 'text-ops-warning' | 'text-ops-info' | 'text-noc-900'

const TONE_RING: Record<StatTone, string> = {
  'text-ops-healthy': 'border-ops-healthy/25',
  'text-ops-critical': 'border-ops-critical/25',
  'text-ops-warning': 'border-ops-warning/25',
  'text-ops-info': 'border-ops-info/25',
  'text-noc-900': 'border-noc-200',
}

function StatTile({
  label,
  value,
  icon,
  hint,
  status,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  hint?: string
  status?: 'success' | 'warning' | 'critical'
}) {
  const tone: StatTone =
    status === 'success'
      ? 'text-ops-healthy'
      : status === 'warning'
        ? 'text-ops-warning'
        : status === 'critical'
          ? 'text-ops-critical'
          : 'text-noc-900'
  return (
    <div className={`rounded-lg border bg-white px-3.5 py-3 ${TONE_RING[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-noc-500 text-[11px] font-medium tracking-wide uppercase">{label}</p>
        {icon ? <span className="text-noc-400">{icon}</span> : null}
      </div>
      <p className={`mt-1.5 text-xl font-semibold tabular ${tone}`}>{value}</p>
      {hint ? <p className="text-noc-500 mt-0.5 text-[11px] leading-relaxed">{hint}</p> : null}
    </div>
  )
}

function Stat({ label, value, tone = 'text-noc-900' }: { label: string; value: string; tone?: StatTone }) {
  return (
    <div>
      <dt className="text-noc-500 text-[11px] font-medium tracking-wide uppercase">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular ${tone}`}>{value}</dd>
    </div>
  )
}
