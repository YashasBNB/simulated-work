import { useState } from 'react'
import { FLAG_REASONS, submitFeedback } from '../../api/feedback'
import { useMutation } from '../../hooks/useAsyncResource'
import type { Feedback } from '../../types/api'
import { Button, CheckIcon, FlagIcon, ThumbDownIcon, ThumbUpIcon } from '../ui/Button'
import { Select, TextArea } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { InlineNotice } from '../ui/States'

/**
 * Helpful / not-helpful rating plus answer flagging.
 *
 * Backend contract (POST /api/v1/feedback):
 *   rating 1 | -1 | 0, flagged bool, flag_reason, flag_details.
 * The backend appends a new Feedback row per submission — it does not upsert,
 * so each click creates a record. See DECISIONS.md.
 */
export function FeedbackBar({
  answerId,
  disabled = false,
  onFeedbackSent,
}: {
  answerId: string
  disabled?: boolean
  onFeedbackSent?: (feedback: Feedback) => void
}) {
  const [selected, setSelected] = useState<1 | -1 | null>(null)
  const [showFlag, setShowFlag] = useState(false)
  const [flagReason, setFlagReason] = useState<string>(FLAG_REASONS[0])
  const [flagDetails, setFlagDetails] = useState('')
  const [sent, setSent] = useState<Feedback | null>(null)

  const rate = useMutation(async (rating: 1 | -1) => submitFeedback({
    answer_id: answerId,
    rating,
    flagged: false,
  }))

  const flag = useMutation(async () =>
    submitFeedback({
      answer_id: answerId,
      rating: 0,
      flagged: true,
      flag_reason: flagReason,
      flag_details: flagDetails.trim() ? flagDetails.trim() : null,
    }),
  )

  const handleRate = async (rating: 1 | -1) => {
    if (disabled) return
    setSelected(rating)
    const result = await rate.run(rating)
    if (result) {
      setSent(result)
      onFeedbackSent?.(result)
    } else {
      setSelected(null)
    }
  }

  const handleFlag = async () => {
    const result = await flag.run()
    if (result) {
      setSent(result)
      setShowFlag(false)
      setFlagDetails('')
      onFeedbackSent?.(result)
    }
  }

  const flagSubmitted = sent?.flagged === true

  return (
    <div className="border-noc-200 rounded-md border bg-noc-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-noc-700">
            {selected ? 'Your rating was recorded.' : 'Was this answer useful?'}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={selected === 1 ? 'success' : 'secondary'}
              disabled={disabled || rate.pending || flagSubmitted}
              loading={rate.pending && selected === 1}
              onClick={() => void handleRate(1)}
              aria-pressed={selected === 1}
            >
              <ThumbUpIcon className="size-3.5" />
              Helpful
            </Button>
            <Button
              size="sm"
              variant={selected === -1 ? 'danger' : 'secondary'}
              disabled={disabled || rate.pending || flagSubmitted}
              loading={rate.pending && selected === -1}
              onClick={() => void handleRate(-1)}
              aria-pressed={selected === -1}
            >
              <ThumbDownIcon className="size-3.5" />
              Not helpful
            </Button>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => setShowFlag(true)}
        >
          <FlagIcon className="size-3.5" />
          Flag for SME review
        </Button>
      </div>

      {rate.error ? (
        <InlineNotice tone="critical" className="mt-2">
          {rate.error}
        </InlineNotice>
      ) : null}
      {sent ? (
        <InlineNotice tone="success" className="mt-2">
          <span className="inline-flex items-center gap-1">
            <CheckIcon className="size-3.5" />
            Feedback stored as <span className="font-mono">{sent.feedback_id}</span>
            {sent.flagged ? ' and queued for SME review.' : '.'}
          </span>
        </InlineNotice>
      ) : null}

      <Modal
        open={showFlag}
        title="Flag this answer for SME review"
        description="Flagged answers enter the SME review queue so the runbook can be corrected. Be specific about what is wrong."
        onClose={() => setShowFlag(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowFlag(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={flag.pending} onClick={() => void handleFlag()}>
              Submit flag
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Flag reason"
            required
            value={flagReason}
            onChange={(event) => setFlagReason(event.target.value)}
            options={FLAG_REASONS.map((reason) => ({ value: reason, label: reason }))}
            hint="The backend stores this value verbatim on the feedback record."
          />
          <TextArea
            label="Details"
            rows={4}
            value={flagDetails}
            onChange={(event) => setFlagDetails(event.target.value)}
            placeholder="e.g. The documented proxy_read_timeout of 120s does not match production config on gateway-03."
            hint="Optional, but strongly recommended for the SME."
          />
          {flag.error ? <InlineNotice tone="critical">{flag.error}</InlineNotice> : null}
        </div>
      </Modal>
    </div>
  )
}
