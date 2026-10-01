import { useState } from 'react'
import { AUDIT_ACTIONS, AUDIT_ENTITIES, listAuditLogs } from '../api/audit'
import { useAsyncResource } from '../hooks/useAsyncResource'
import { formatDateTime, titleCase } from '../lib/format'
import type { AuditLog } from '../types/api'
import { Card, CardHeader, PageHeader } from '../components/ui/Card'
import { Button, RefreshIcon, ShieldIcon } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select, TextInput } from '../components/ui/Field'
import { EmptyState, InlineNotice, TableSkeleton } from '../components/ui/States'
import { DataTable, Disclosure } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'

type ActionTone = 'info' | 'warning' | 'critical' | 'success' | 'neutral'

/** Map the backend's audit actions onto operational severity for scanning. */
function actionTone(action: string): ActionTone {
  switch (action) {
    case 'ANSWER_FLAGGED':
    case 'FLAG_REVIEWED':
      return 'warning'
    case 'DOCUMENT_DEPRECATED':
    case 'DOCUMENT_UPLOADED':
    case 'CATEGORY_CREATED':
      return 'info'
    case 'USER_LOGIN':
      return 'neutral'
    default:
      return 'success'
  }
}

function renderDetails(details: Record<string, unknown>): [string, string][] {
  return Object.entries(details).map(([key, value]) => [
    key,
    value === null || value === undefined
      ? '—'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value),
  ])
}

/** GET /api/v1/audit — compliance trail (system_admin, noc_lead, content_admin). */
export function AuditPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [limit, setLimit] = useState(50)

  const logs = useAsyncResource<AuditLog[]>(
    (signal) =>
      listAuditLogs(
        {
          action: actionFilter || undefined,
          entity: entityFilter || undefined,
          user_id: userFilter || undefined,
          limit,
        },
        signal,
      ),
    [actionFilter, entityFilter, userFilter, limit],
  )

  const rows = logs.data ?? []

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp (UTC)',
      cell: (log) => (
        <span className="tabular text-xs whitespace-nowrap text-noc-800">
          {formatDateTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (log) => <Badge tone={actionTone(log.action)}>{titleCase(log.action)}</Badge>,
    },
    {
      key: 'entity',
      header: 'Entity',
      cell: (log) => (
        <div className="min-w-0">
          <p className="text-xs text-noc-800">{log.entity}</p>
          {log.entity_id ? (
            <p className="text-noc-500 font-mono text-[10px] break-all">{log.entity_id}</p>
          ) : null}
        </div>
      ),
      hideBelow: 'md',
    },
    {
      key: 'user',
      header: 'User',
      cell: (log) => (
        <span className="font-mono text-[11px] break-all text-noc-700">{log.user_id ?? 'system'}</span>
      ),
    },
    {
      key: 'ip',
      header: 'Source IP',
      cell: (log) => (
        <span className="tabular text-[11px] text-noc-600">{log.ip_address ?? '—'}</span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'details',
      header: 'Details',
      cell: (log) => {
        const entries = renderDetails(log.details ?? {})
        if (entries.length === 0) return <span className="text-noc-500 text-xs">—</span>
        return (
          <Disclosure summary={`${entries.length} field${entries.length === 1 ? '' : 's'}`}>
            <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {entries.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-noc-500 font-mono text-[10px]">{key}</dt>
                  <dd className="font-mono text-[11px] break-all text-noc-800">{value}</dd>
                </div>
              ))}
            </dl>
          </Disclosure>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable compliance trail of every query, feedback, document and administrative action recorded by the backend."
        actions={
          <Button variant="secondary" onClick={logs.reload} loading={logs.refreshing}>
            <RefreshIcon className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="px-5 py-4">
        <Card className="mb-3">
          <CardHeader
            title="Filters"
            description="Filters map directly onto the backend query parameters action, entity, user_id and limit (max 200)."
            icon={<ShieldIcon />}
          />
          <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Action"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              options={[
                { value: '', label: 'All actions' },
                ...AUDIT_ACTIONS.map((action) => ({ value: action, label: titleCase(action) })),
              ]}
            />
            <Select
              label="Entity"
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              options={[
                { value: '', label: 'All entities' },
                ...AUDIT_ENTITIES.map((entity) => ({ value: entity, label: entity })),
              ]}
            />
            <TextInput
              label="User ID"
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              placeholder="e.g. usr_l1_eng"
              autoComplete="off"
              className="font-mono"
            />
            <Select
              label="Rows to load"
              value={String(limit)}
              onChange={(event) => setLimit(Number(event.target.value))}
              options={[50, 100, 200].map((value) => ({ value: String(value), label: String(value) }))}
            />
          </div>
        </Card>

        {logs.error ? (
          <InlineNotice tone="critical" className="mb-3">
            {logs.error}
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={logs.reload}>
                <RefreshIcon className="size-3.5" />
                Retry
              </Button>
            </div>
          </InlineNotice>
        ) : null}

        <Card>
          {logs.loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : (
            <DataTable
              caption="Audit log entries, newest first"
              dense
              columns={columns}
              rows={rows}
              rowKey={(log) => log.log_id}
              emptyState={
                <EmptyState
                  title={rows.length === 0 && (actionFilter || entityFilter || userFilter)
                    ? 'No entries match these filters'
                    : 'No audit entries'}
                  description={
                    rows.length === 0 && (actionFilter || entityFilter || userFilter)
                      ? 'Clear the filters to see the full compliance trail.'
                      : 'The backend writes an entry for every query, upload, deprecation and administrative action.'
                  }
                  icon={<ShieldIcon className="size-7" />}
                />
              }
            />
          )}
        </Card>

        {!logs.loading && !logs.error ? (
          <p className="text-noc-500 mt-2 text-[11px]">
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} loaded, newest first. The backend caps
            `limit` at 200.
          </p>
        ) : null}
      </div>
    </div>
  )
}
