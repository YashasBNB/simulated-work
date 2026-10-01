import { Link } from 'react-router-dom'
import { parseGroundedAnswer } from '../../lib/answerParser'
import { CONFIDENCE_BAND_STYLES, confidenceBand } from '../../lib/confidence'
import { formatDateTime, formatLatency } from '../../lib/format'
import type { Answer } from '../../types/api'
import { Badge, ConfidenceMeter, ConfidencePill, QueryTypeBadge } from '../ui/Badge'
import { CheckIcon, CopyIcon, DocumentIcon, Spinner } from '../ui/Button'
import { Card, CardBody, CardHeader, MetaItem } from '../ui/Card'
import { CitationList } from './CitationList'
import { FeedbackBar } from './FeedbackBar'
import { Markdown } from './Markdown'

/**
 * The core answer surface: grounded response, confidence, troubleshooting steps,
 * source citations, and feedback/flagging. `is_confident=false` renders the
 * PRD-mandated "no confident answer" state instead of an answer body.
 */
export function AnswerPanel({
  answer,
  feedbackDisabled = false,
  onFeedbackSent,
}: {
  answer: Answer
  feedbackDisabled?: boolean
  onFeedbackSent?: () => void
}) {
  const band = confidenceBand(answer.confidence, answer.is_confident)
  const bandStyle = CONFIDENCE_BAND_STYLES[band]
  const parsed = parseGroundedAnswer(answer.response_text)

  return (
    <div className="space-y-4">
      {/* Answer meta strip */}
      <div className="bg-noc-900 text-noc-50 rounded-lg border border-noc-800 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-48 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-noc-400 uppercase">
              Incident query
            </p>
            <p className="mt-0.5 font-mono text-sm break-words text-noc-50">{answer.query_text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <QueryTypeBadge type={answer.query_type} />
              <Badge tone="muted" className="border-noc-700 bg-noc-800 text-noc-300">
                {formatLatency(answer.latency_ms)}
              </Badge>
              <Badge tone="muted" className="border-noc-700 bg-noc-800 text-noc-300">
                {formatDateTime(answer.created_at)} UTC
              </Badge>
              <CopyQueryText text={answer.query_text} />
            </div>
          </div>

          <div className="w-full sm:w-56 sm:flex-none">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold tracking-wider text-noc-400 uppercase">
                Answer confidence
              </span>
              <span className={`text-sm font-semibold tabular ${bandStyle.text.replace('text-', 'text-')}`}>
                {(answer.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <ConfidenceMeter confidence={answer.confidence} isConfident={answer.is_confident} />
            <p className="mt-1.5 text-[11px] text-noc-400">
              {band === 'none'
                ? 'Below the backend confidence threshold (0.35) — no answer was generated.'
                : bandStyle.label}
            </p>
          </div>
        </div>

        {answer.detected_error_codes.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-noc-800 pt-2.5">
            <span className="text-[10px] font-semibold tracking-wider text-noc-400 uppercase">
              Detected error codes
            </span>
            {answer.detected_error_codes.map((code) => (
              <span
                key={code}
                className="border-ops-info/40 bg-ops-info/15 rounded border px-1.5 py-0.5 font-mono text-[11px] text-noc-50"
              >
                {code}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* No-confident-answer state (PRD requirement) */}
      {!answer.is_confident ? (
        <Card className="border-ops-critical/40">
          <CardHeader
            title="No confident answer found"
            description="The assistant did not meet its grounding threshold for this query, so no answer text is shown. Nothing below was generated."
            icon={<DocumentIcon />}
          />
          <CardBody className="space-y-3">
            <div className="border-ops-critical/30 bg-ops-critical-bg rounded-md border px-3 py-2.5">
              <p className="text-xs leading-relaxed text-noc-700">{answer.response_text}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetaItem label="Confidence" value={`${(answer.confidence * 100).toFixed(1)}%`} />
              <MetaItem label="Threshold" value="35.0%" />
              <MetaItem label="Citations" value="0" />
              <MetaItem label="Latency" value={formatLatency(answer.latency_ms)} />
            </dl>
            <div className="border-noc-200 rounded-md border bg-noc-50 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-noc-700">
                This query has been recorded as a documentation gap and appears in the NOC analytics
                dashboard. Escalate to a Senior SME, or check whether a newer runbook exists for this
                vendor.
              </p>
            </div>
            <FeedbackBar
              answerId={answer.answer_id}
              disabled={feedbackDisabled}
              onFeedbackSent={onFeedbackSent}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Grounded answer body */}
          <Card>
            <CardHeader
              title="Grounded resolution"
              description="Answered strictly from authorized, non-deprecated runbook sections."
              icon={<DocumentIcon />}
              actions={<ConfidencePill confidence={answer.confidence} isConfident={answer.is_confident} />}
            />
            <CardBody className="space-y-4">
              {parsed.summary ? (
                <section aria-labelledby="answer-summary">
                  <h3
                    id="answer-summary"
                    className="text-noc-500 mb-1.5 text-[11px] font-semibold tracking-wider uppercase"
                  >
                    Quick assessment
                  </h3>
                  <p className="text-sm leading-relaxed text-noc-800">{parsed.summary}</p>
                </section>
              ) : null}

              {parsed.steps.length > 0 ? (
                <section aria-labelledby="answer-steps">
                  <h3
                    id="answer-steps"
                    className="text-noc-500 mb-2 text-[11px] font-semibold tracking-wider uppercase"
                  >
                    Troubleshooting steps
                  </h3>
                  <ol className="space-y-2">
                    {parsed.steps.map((step, index) => (
                      <li
                        key={`${index}-${step.slice(0, 24)}`}
                        className="border-noc-200 bg-noc-50 flex gap-2.5 rounded-md border px-3 py-2"
                      >
                        <span className="bg-ops-info mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="font-mono text-xs leading-relaxed break-words text-noc-800">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {parsed.commands.length > 0 ? (
                <section aria-labelledby="answer-commands">
                  <h3
                    id="answer-commands"
                    className="text-noc-500 mb-1.5 text-[11px] font-semibold tracking-wider uppercase"
                  >
                    Verification &amp; diagnostic commands
                  </h3>
                  <pre className="scrollbar-slim bg-noc-900 overflow-x-auto rounded-md border border-noc-800 p-3">
                    <code className="font-mono text-xs leading-relaxed text-noc-50">
                      {parsed.commands.join('\n')}
                    </code>
                  </pre>
                </section>
              ) : null}

              {parsed.additionalReferences.length > 0 ? (
                <section aria-labelledby="answer-additional-refs">
                  <h3
                    id="answer-additional-refs"
                    className="text-noc-500 mb-1.5 text-[11px] font-semibold tracking-wider uppercase"
                  >
                    Additional corroborating references
                  </h3>
                  {/* Reference lines carry Markdown emphasis; render it. */}
                  <Markdown className="text-xs">{parsed.additionalReferences.join('\n')}</Markdown>
                </section>
              ) : null}

              {parsed.verifiedCitation ? (
                <div className="border-ops-info/40 bg-ops-info-bg rounded-r border-l-2 py-1.5 pr-2 pl-3">
                  <p className="text-ops-info flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    <CheckIcon className="size-3.5" />
                    Verified source citation
                  </p>
                  <Markdown className="text-xs">
                    {parsed.verifiedCitation.replace(/^\*\*Verified Source Citation:?\*\*:?/i, '')}
                  </Markdown>
                </div>
              ) : null}

              {/* Free-form answers (no recognised envelope) render as Markdown. */}
              {!parsed.structured ? <Markdown>{parsed.leftover}</Markdown> : null}
            </CardBody>
          </Card>

          {/* Source citations — always shown for a confident answer */}
          <Card>
            <CardHeader
              title="Source citations"
              description="Document, version and section reference backing this answer."
              icon={<DocumentIcon />}
              actions={
                <Badge tone={answer.citations.length > 0 ? 'success' : 'critical'}>
                  {answer.citations.length} source{answer.citations.length === 1 ? '' : 's'}
                </Badge>
              }
            />
            <CardBody>
              <CitationList citations={answer.citations} />
            </CardBody>
          </Card>

          <FeedbackBar
            answerId={answer.answer_id}
            disabled={feedbackDisabled}
            onFeedbackSent={onFeedbackSent}
          />
        </>
      )}
    </div>
  )
}

function CopyQueryText({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text)
      }}
      className="border-noc-700 text-noc-300 hover:bg-noc-800 inline-flex items-center gap-1 rounded border bg-noc-800/60 px-1.5 py-0.5 text-[11px] transition-colors"
      title="Copy query text"
    >
      <CopyIcon className="size-3" />
      Copy
    </button>
  )
}

export function AnswerLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="bg-noc-900 rounded-lg border border-noc-800 px-4 py-3">
        <div className="flex items-center gap-2 text-noc-300">
          <Spinner className="size-4" />
          <span className="text-xs font-medium" role="status">
            Retrieving authorized runbooks and synthesising a grounded answer…
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="bg-noc-800 h-2.5 w-2/3 animate-pulse rounded" />
          <div className="bg-noc-800 h-2.5 w-1/3 animate-pulse rounded" />
        </div>
      </div>
      <div className="rounded-lg border border-noc-200 bg-white p-4">
        <div className="space-y-2">
          <div className="bg-noc-200 h-3 w-1/4 animate-pulse rounded" />
          <div className="bg-noc-200 h-3 w-full animate-pulse rounded" />
          <div className="bg-noc-200 h-3 w-5/6 animate-pulse rounded" />
          <div className="bg-noc-200 mt-4 h-3 w-full animate-pulse rounded" />
          <div className="bg-noc-200 h-3 w-4/5 animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}

export function NoAnswerGuidance() {
  return (
    <div className="border-noc-200 rounded-lg border border-dashed bg-white px-4 py-5">
      <p className="text-sm font-semibold text-noc-800">No confident answer for this query</p>
      <p className="mt-1 text-xs leading-relaxed text-noc-600">
        The retrieval engine returned nothing above the 0.35 confidence threshold in the categories
        your role can access. Try an error code (for example{' '}
        <code className="bg-noc-100 rounded px-1 font-mono">CrashLoopBackOff</code> or{' '}
        <code className="bg-noc-100 rounded px-1 font-mono">HTTP 504</code>), widen your wording, or
        escalate to a Senior SME.
      </p>
      <Link
        to="/history"
        className="text-ops-info mt-2 inline-block text-xs font-medium hover:underline"
      >
        Review your query history
      </Link>
    </div>
  )
}
