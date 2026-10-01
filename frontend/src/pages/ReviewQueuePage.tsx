import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FLAG_STATUS_FILTERS, listFlaggedFeedback, reviewFlaggedFeedback } from '../api/feedback'
import { useAuth } from '../auth/authContext'
import { hasCapability } from '../auth/rbac'
import { useAsyncResource, useMutation } from '../hooks/useAsyncResource'
import { formatDateTime, titleCase, truncate } from '../lib/format'
import type { Feedback, ResolutionAction } from '../types/api'
import { RESOLUTION_ACTIONS } from '../api/feedback'
import type { FlagStatusFilter } from '../api/feedback'
import { Card, CardBody, PageHeader } from '../components/ui/Card'
import { AlertIcon, Button, CheckIcon, FlagIcon, RefreshIcon } from '../components/ui/Button'
import { Badge, FlagStatusBadge } from '../components/ui/Badge'
import { Select, TextArea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { EmptyState, InlineNotice, LoadingState } from '../components/ui/States'
import { Disclosure } from '../components/ui/Table'

/**
 * SME Review Queue.
 *
 * GET  /api/v1/feedback/flagged — sme_senior, content_admin, system_admin, noc_lead
 * POST /api/v1/feedback/{id}/review — sme_senior, system_admin
 *
 * noc_lead can read the queue but cannot resolve; the resolve action is hidden
 * for that role and the backend would reject it with 403 anyway.
 */
export function ReviewQueuePage() {
  const { user } = useAuth()
  const roleId = user?.role_id ?? ''
  const canResolve = hasCapability(roleId, 'resolveFlags')

  const [statusFilter, setStatusFilter] = useState<FlagStatusFilter>('pending')
  const [active, setActive] = useState<Feedback | null>(null)

  const queue = useAsyncResource<Feedback[]>(
    (signal) => listFlaggedFeedback(statusFilter, signal),
    [statusFilter],
  )

  const rows = queue.data ?? []
  const pendingCount = rows.filter((row) => row.flag_status.toLowerCase() === 'pending').length

  return (
    <div>
      <PageHeader
        title="SME Review Queue"
        description="Answers flagged by engineers. Review each flag to resolve documentation gaps before they cause repeat interruptions."
        actions={
          <Button variant="secondary" onClick={queue.reload} loading={queue.refreshing}>
            <RefreshIcon className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="px-5 py-4">
        {!canResolve ? (
          <InlineNotice tone="info" className="mb-3">
            Your role can review the queue but cannot resolve flags. Resolution is limited to Senior
            SME and System Admin accounts.
          </InlineNotice>
        ) : null}

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Select
              label="Flag status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as FlagStatusFilter)}
              options={FLAG_STATUS_FILTERS.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
          <p className="text-noc-600 pb-2 text-xs">
            {rows.length} flag{rows.length === 1 ? '' : 's'} loaded
            {statusFilter === 'pending' && pendingCount > 0 ? ` · ${pendingCount} awaiting review` : ''}
          </p>
        </div>

        {queue.loading ? (
          <Card>
            <LoadingState label="Loading review queue…" />
          </Card>
        ) : queue.error ? (
          <Card>
            <CardBody>
              <InlineNotice tone="critical">
                {queue.error}
                <div className="mt-2">
                  <Button size="sm" variant="secondary" onClick={queue.reload}>
                    <RefreshIcon className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </InlineNotice>
            </CardBody>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState
              title={
                statusFilter === 'pending' ? 'No flags awaiting review' : 'No flags with this status'
              }
              description="When an engineer flags an answer as outdated, incorrect or unsafe, it appears here for SME triage."
              icon={<FlagIcon className="size-7" />}
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.feedback_id}>
                <FlagRow
                  feedback={row}
                  canResolve={canResolve}
                  onReview={() => {
                    setActive(row)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {active ? (
        <ReviewModal
          feedback={active}
          canResolve={canResolve}
          onClose={() => setActive(null)}
          onResolved={() => {
            setActive(null)
            queue.reload()
          }}
        />
      ) : null}
    </div>
  )
}

function FlagRow({
  feedback,
  canResolve,
  onReview,
}: {
  feedback: Feedback
  canResolve: boolean
  onReview: () => void
}) {
  const isPending = feedback.flag_status.toLowerCase() === 'pending'

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <FlagStatusBadge status={feedback.flag_status} />
            <Badge tone="critical">{feedback.flag_reason ?? 'No reason given'}</Badge>
            <Badge tone="muted" title="Rating recorded with this flag">
              Rating {feedback.rating > 0 ? `+${feedback.rating}` : feedback.rating}
            </Badge>
            <span className="text-noc-500 font-mono text-[11px]">{feedback.feedback_id}</span>
          </div>

          {feedback.query_text ? (
            <p className="mt-2 font-mono text-xs break-words text-noc-900">
              {truncate(feedback.query_text, 200)}
            </p>
          ) : (
            <p className="text-noc-500 mt-2 text-xs">The originating query is no longer available.</p>
          )}

          {feedback.flag_details ? (
            <p className="text-noc-700 mt-1.5 text-xs leading-relaxed break-words">
              {feedback.flag_details}
            </p>
          ) : null}

          <p className="text-noc-500 mt-2 text-[11px]">
            Flagged by <span className="font-mono">{feedback.user_id}</span> ·{' '}
            {formatDateTime(feedback.created_at)} UTC
          </p>
        </div>

        {/* No action button for read-only roles: they get the flag detail inline below. */}
        {canResolve ? (
          <Button
            size="sm"
            variant={isPending ? 'primary' : 'secondary'}
            disabled={!isPending}
            onClick={onReview}
          >
            {isPending ? 'Review' : 'View resolution'}
          </Button>
        ) : null}
      </div>

      {feedback.answer_text ? (
        <div className="border-t border-noc-200 px-4 py-3">
          <Disclosure
            summary={
              <span className="flex items-center gap-1.5">
                <AlertIcon className="text-noc-500 size-3.5" />
                Flagged answer excerpt
              </span>
            }
          >
            <pre className="scrollbar-slim bg-noc-50 max-h-64 overflow-auto rounded border border-noc-200 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-noc-800">
              {feedback.answer_text}
            </pre>
            <p className="text-noc-500 mt-1.5 font-mono text-[10px] break-all">
              answer_id {feedback.answer_id} · excerpt truncated by the backend to 300 characters
            </p>
            <Link
              to="/history"
              className="text-ops-info mt-1.5 inline-block text-xs font-medium hover:underline"
            >
              Open the full answer in query history
            </Link>
          </Disclosure>
        </div>
      ) : null}

      {feedback.reviewer_notes ? (
        <div className="border-t border-noc-200 bg-noc-50 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ops-healthy uppercase">
            <CheckIcon className="size-3.5" />
            Resolution
          </p>
          <p className="text-noc-800 mt-1 text-xs leading-relaxed break-words">
            {feedback.reviewer_notes}
          </p>
          <p className="text-noc-500 mt-1 text-[11px]">
            {feedback.resolution_action ? titleCase(feedback.resolution_action) : 'No action recorded'} ·
            reviewed by {feedback.reviewer_id ?? '—'} · {formatDateTime(feedback.reviewed_at)} UTC
          </p>
        </div>
      ) : null}
    </Card>
  )
}

function ReviewModal({
  feedback,
  canResolve,
  onClose,
  onResolved,
}: {
  feedback: Feedback
  canResolve: boolean
  onClose: () => void
  onResolved: () => void
}) {
  const [flagStatus, setFlagStatus] = useState<'reviewed' | 'resolved' | 'dismissed'>('resolved')
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>('doc_updated')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const review = useMutation(() =>
    reviewFlaggedFeedback(feedback.feedback_id, {
      flag_status: flagStatus,
      resolution_action: resolutionAction,
      reviewer_notes: notes.trim() || null,
    }),
  )

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setValidationError('Reviewer notes are required so the history explains the decision.')
      return
    }
    setValidationError(null)
    const result = await review.run()
    if (result) onResolved()
  }

  return (
    <Modal
      open
      title="Resolve flagged answer"
      description="Recorded against your user id and written to the audit log as FLAG_REVIEWED."
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canResolve}
            loading={review.pending}
            loadingLabel="Saving…"
            onClick={() => void handleSubmit()}
          >
            <CheckIcon className="size-3.5" />
            Save resolution
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <dl className="border-noc-200 grid grid-cols-1 gap-2.5 rounded-md border bg-noc-50 p-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">Flag reason</dt>
            <dd className="mt-0.5 text-xs text-noc-800">{feedback.flag_reason ?? '—'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">
              Raised by
            </dt>
            <dd className="mt-0.5 font-mono text-xs text-noc-800">{feedback.user_id}</dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">Query</dt>
            <dd className="mt-0.5 font-mono text-xs break-words text-noc-800">
              {feedback.query_text ?? '—'}
            </dd>
          </div>
          {feedback.flag_details ? (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">Details</dt>
              <dd className="mt-0.5 text-xs leading-relaxed break-words text-noc-800">
                {feedback.flag_details}
              </dd>
            </div>
          ) : null}
        </dl>

        {feedback.answer_text ? (
          <div>
            <p className="text-noc-500 mb-1 text-[11px] font-semibold tracking-wider uppercase">
              Flagged answer excerpt
            </p>
            <pre className="scrollbar-slim bg-noc-900 max-h-52 overflow-auto rounded-md border border-noc-800 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-noc-50">
              {feedback.answer_text}
            </pre>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Flag status"
            required
            value={flagStatus}
            onChange={(event) => setFlagStatus(event.target.value as 'reviewed' | 'resolved' | 'dismissed')}
            options={[
              { value: 'reviewed', label: 'Reviewed' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'dismissed', label: 'Dismissed' },
            ]}
          />
          <Select
            label="Resolution action"
            value={resolutionAction ?? ''}
            onChange={(event) => setResolutionAction((event.target.value || null) as ResolutionAction)}
            options={RESOLUTION_ACTIONS.map((action) => ({ value: action.value, label: action.label }))}
          />
        </div>

        <TextArea
          label="Reviewer notes"
          required
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Confirmed the runbook lists an obsolete proxy_read_timeout. Updated to 180s and re-ingested as v3.1.3."
          error={validationError}
        />

        {!canResolve ? (
          <InlineNotice tone="warning">
            Your role cannot submit a resolution. The backend restricts review to Senior SME and
            System Admin.
          </InlineNotice>
        ) : null}
        {review.error ? <InlineNotice tone="critical">{review.error}</InlineNotice> : null}
      </div>
    </Modal>
  )
}
