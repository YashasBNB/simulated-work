import { apiRequest } from './client'
import type { AnalyticsOverview } from '../types/api'

/**
 * GET /api/v1/analytics/overview — NOC/admin metrics.
 * Backend permissions: noc_lead, system_admin, content_admin, sme_senior.
 */
export function getAnalyticsOverview(signal?: AbortSignal): Promise<AnalyticsOverview> {
  return apiRequest<AnalyticsOverview>('/api/v1/analytics/overview', { signal })
}
