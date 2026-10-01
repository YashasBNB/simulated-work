import { useState } from 'react'
import { getQueryHistory } from '../api/query'
import { useAuth } from '../auth/authContext'
import { useAsyncResource } from '../hooks/useAsyncResource'
import { formatDateTime, formatLatency, truncate } from '../lib/format'
import type { Answer, QueryHistoryItem } from '../types/api'
import { PageHeader } from '../components/ui/Card'
import { Button, ClockIcon, DocumentIcon, RefreshIcon } from '../components/ui/Button'
import { Badge, ConfidencePill, QueryTypeBadge } from '../components/ui/Badge'
import { Card, CardBody } from '../components/ui/Card'
import { EmptyState, ErrorState, LoadingState, PageError } from '../components/ui/States'
import { DataTable } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'
import { AnswerPanel } from '../components/assistant/AnswerPanel'

type HistoryFilter = 'all' | 'confident' | 'no_answer'

/** GET /api/v1/query/history — the signed-in engineer's own query log. */
export function HistoryPage() {
  const { user } = useAuth()
  const [limit, setLimit] = useState(25)
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [selected, setSelected] = useState<Answer | null>(null)

  const history = useAsyncResource<QueryHistoryItem[]>(
    (signal) => getQueryHistory({ limit, signal }),
    [limit],
  )

  const items = history.data ?? []
  const visible = items.filter((item) => {
    if (filter === 'confident') return item.answer?.is_confident === true
    if (filter === 'no_answer') return item.answer ? !item.answer.is_confident : false
    return true
  })

  const columns: Column<QueryHistoryItem>[] = [
    {
      key: 'query',
      header: 'Query',
      cell: (item) => (
        <div className="min-w-0">
          <p className="font-mono text-xs break-words text-noc-900">{truncate(item.query_text, 140)}</p>
          <p className="text-noc-500 mt-0.5 font-mono text-[10px]">{item.query_id}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (item) => <QueryTypeBadge type={item.query_type} />,
      hideBelow: 'md',
    },
    {
      key: 'outcome',
      header: 'Outcome',
      cell: (item) =>
        item.answer ? (
          <ConfidencePill confidence={item.answer.confidence} isConfident={item.answer.is_confident} />
        ) : (
          <Badge tone="muted">No answer stored</Badge>
        ),
    },
    {
      key: 'citations',
      header: 'Sources',
      cell: (item) => (
        <span className="tabular text-xs text-noc-700">
          {item.answer?.citations.length ?? 0}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'latency',
      header: 'Latency',
      cell: (item) => (
        <span className="tabular text-xs text-noc-700">{formatLatency(item.answer?.latency_ms)}</span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'when',
      header: 'Queried (UTC)',
      cell: (item) => (
        <span className="tabular text-xs whitespace-nowrap text-noc-700">
          {formatDateTime(item.created_at)}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'sr-only',
      cell: (item) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={!item.answer}
          onClick={(event) => {
            event.stopPropagation()
            if (item.answer) setSelected(item.answer)
          }}
        >
          View
        </Button>
      ),
      className: 'text-right',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Query History"
        description={`Queries you have run on this platform${user?.name ? ` as ${user.name}` : ''}, newest first.`}
        actions={
          <>
            <label className="sr-only" htmlFor="history-limit">
              Results to load
            </label>
            <select
              id="history-limit"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="border-noc-300 text-noc-800 h-9 rounded-md border bg-white px-2 text-xs"
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  Last {value}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={history.reload}
              loading={history.refreshing}
              loadingLabel="Refreshing…"
            >
              <RefreshIcon className="size-3.5" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter history">
          {(
            [
              { value: 'all', label: `All (${items.length})` },
              {
                value: 'confident',
                label: `Confident (${items.filter((i) => i.answer?.is_confident).length})`,
              },
              {
                value: 'no_answer',
                label: `No answer (${items.filter((i) => i.answer && !i.answer.is_confident).length})`,
              },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === option.value
                  ? 'border-ops-info bg-ops-info-bg text-ops-info'
                  : 'border-noc-300 bg-white text-noc-700 hover:bg-noc-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {selected ? (
          <Card className="mb-4">
            <CardBody>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-noc-900">Stored answer</h2>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              <AnswerPanel
                answer={selected}
                onFeedbackSent={() => {
                  /* feedback is stored server-side; history stays read-only */
                }}
              />
            </CardBody>
          </Card>
        ) : null}

        <Card>
          {history.loading ? (
            <LoadingState label="Loading query history…" />
          ) : history.error ? (
            <PageError error={history.error} onRetry={history.reload} />
          ) : (
            <DataTable
              caption="Your past incident queries and their grounded answers"
              columns={columns}
              rows={visible}
              rowKey={(item) => item.query_id}
              dense
              emptyState={
                <EmptyState
                  title={items.length === 0 ? 'No queries yet' : 'No queries match this filter'}
                  description={
                    items.length === 0
                      ? 'Run an incident search on the Incident Assistant and it will appear here automatically.'
                      : 'Clear the filter to see all of your recent queries.'
                  }
                  icon={<ClockIcon className="size-7" />}
                />
              }
            />
          )}
        </Card>

        {!history.loading && !history.error && items.length > 0 ? (
          <p className="text-noc-500 mt-2 flex items-center gap-1.5 text-[11px]">
            <DocumentIcon className="size-3.5" />
            Showing {visible.length} of {items.length} loaded queries. Answers are immutable
            snapshots of what the assistant returned at the time.
          </p>
        ) : null}

        {history.error ? (
          <div className="mt-3">
            <ErrorState error={history.error} onRetry={history.reload} compact />
          </div>
        ) : null}
      </div>
    </div>
  )
}
