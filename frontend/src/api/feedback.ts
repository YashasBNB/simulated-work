import { apiRequest } from './client'
import type { Feedback, ResolutionAction } from '../types/api'

export interface SubmitFeedbackInput {
  answer_id: string
  /** 1 = helpful, -1 = unhelpful, 0 = neutral (flag-only) */
  rating: number
  flagged: boolean
  flag_reason?: string | null
  flag_details?: string | null
}

/** POST /api/v1/feedback — rate an answer and/or flag it for SME review. */
export function submitFeedback(input: SubmitFeedbackInput): Promise<Feedback> {
  return apiRequest<Feedback>('/api/v1/feedback', {
    method: 'POST',
    body: {
      answer_id: input.answer_id,
      rating: input.rating,
      flagged: input.flagged,
      flag_reason: input.flag_reason ?? null,
      flag_details: input.flag_details ?? null,
    },
  })
}

export type FlagStatusFilter = 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'all'

/**
 * GET /api/v1/feedback/flagged — review queue.
 * Backend permissions: sme_senior, content_admin, system_admin, noc_lead.
 * `statusFilter` is passed as `status_filter`; 'all' disables the filter.
 */
export function listFlaggedFeedback(
  statusFilter: FlagStatusFilter = 'pending',
  signal?: AbortSignal,
): Promise<Feedback[]> {
  return apiRequest<Feedback[]>('/api/v1/feedback/flagged', {
    query: { status_filter: statusFilter },
    signal,
  })
}

export interface ReviewFlagInput {
  flag_status: 'reviewed' | 'resolved' | 'dismissed'
  resolution_action?: ResolutionAction
  reviewer_notes?: string | null
}

/**
 * POST /api/v1/feedback/{id}/review — SME resolution.
 * Backend permissions: sme_senior, system_admin (noc_lead can read the queue
 * but cannot resolve — see DECISIONS.md).
 */
export function reviewFlaggedFeedback(
  feedbackId: string,
  input: ReviewFlagInput,
): Promise<Feedback> {
  return apiRequest<Feedback>(`/api/v1/feedback/${encodeURIComponent(feedbackId)}/review`, {
    method: 'POST',
    body: {
      flag_status: input.flag_status,
      resolution_action: input.resolution_action ?? null,
      reviewer_notes: input.reviewer_notes ?? null,
    },
  })
}

/** Flag reasons the backend schema documents; also the PRD's risk categories. */
export const FLAG_REASONS = [
  'outdated runbook',
  'incorrect command',
  'hallucinated step',
  'safety risk',
] as const

export const RESOLUTION_ACTIONS: { value: NonNullable<ResolutionAction>; label: string }[] = [
  { value: 'doc_updated', label: 'Documentation updated' },
  { value: 'doc_deprecated', label: 'Document deprecated' },
  { value: 'false_positive', label: 'False positive' },
  { value: 'wont_fix', label: "Won't fix" },
]

export const FLAG_STATUS_FILTERS: { value: FlagStatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All statuses' },
]
