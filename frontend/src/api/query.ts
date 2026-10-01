import { apiRequest } from './client'
import type { Answer, QueryHistoryItem } from '../types/api'

/** POST /api/v1/query — run an NL / error-code search. */
export function runQuery(params: {
  query_text: string
  category_filter?: string | null
  signal?: AbortSignal
}): Promise<Answer> {
  const { signal, ...body } = params
  return apiRequest<Answer>('/api/v1/query', {
    method: 'POST',
    body: {
      query_text: body.query_text,
      category_filter: body.category_filter ?? null,
    },
    signal,
  })
}

/** GET /api/v1/query/history — the signed-in user's past queries (newest first). */
export function getQueryHistory(params: { limit?: number; signal?: AbortSignal } = {}): Promise<
  QueryHistoryItem[]
> {
  return apiRequest<QueryHistoryItem[]>('/api/v1/query/history', {
    query: { limit: params.limit ?? 25 },
    signal: params.signal,
  })
}
