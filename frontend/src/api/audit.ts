import { apiRequest } from './client'
import type { AuditLog } from '../types/api'

export interface AuditFilters {
  action?: string
  entity?: string
  user_id?: string
  /** Backend caps `limit` at 200. */
  limit?: number
}

/**
 * GET /api/v1/audit — compliance trail, newest first.
 * Backend permissions: system_admin, noc_lead, content_admin.
 */
export function listAuditLogs(filters: AuditFilters = {}, signal?: AbortSignal): Promise<AuditLog[]> {
  return apiRequest<AuditLog[]>('/api/v1/audit', {
    query: {
      action: filters.action || undefined,
      entity: filters.entity || undefined,
      user_id: filters.user_id || undefined,
      limit: filters.limit ?? 50,
    },
    signal,
  })
}

/** Distinct audit actions the backend writes, for the filter dropdown. */
export const AUDIT_ACTIONS = [
  'USER_LOGIN',
  'QUERY_EXECUTED',
  'FEEDBACK_SUBMITTED',
  'ANSWER_FLAGGED',
  'FLAG_REVIEWED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DEPRECATED',
  'CATEGORY_CREATED',
] as const

export const AUDIT_ENTITIES = ['User', 'Query', 'Feedback', 'Document', 'Category'] as const
