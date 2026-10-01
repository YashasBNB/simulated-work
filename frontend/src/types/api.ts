/**
 * Wire types mirroring the FastAPI Pydantic schemas in `backend/app/schemas/`.
 * These are the source of truth for the frontend contract — do not invent fields.
 */

export interface Role {
  role_id: string
  role_name: string
  description: string | null
  permitted_categories: string[]
  created_at: string
}

export interface User {
  user_id: string
  name: string
  email: string
  role_id: string
  is_active: boolean
  created_at: string
}

export interface UserWithRole extends User {
  role: Role
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: UserWithRole
}

export interface Citation {
  chunk_id: string
  doc_id: string
  title: string
  version: string
  vendor: string | null
  category_id: string
  category_name: string | null
  section_ref: string
  snippet: string
  relevance_score: number
}

export type QueryType = 'nl' | 'error_code'

export interface Answer {
  answer_id: string
  query_id: string
  query_text: string
  query_type: QueryType
  detected_error_codes: string[]
  response_text: string
  confidence: number
  is_confident: boolean
  citations: Citation[]
  latency_ms: number
  created_at: string
}

export interface QueryHistoryItem {
  query_id: string
  query_text: string
  query_type: QueryType
  created_at: string
  answer: Answer | null
}

export interface Category {
  category_id: string
  name: string
  vendor: string | null
  description: string | null
  created_at: string
}

export type DocumentStatus = 'active' | 'deprecated' | (string & {})

export interface Document {
  doc_id: string
  title: string
  vendor: string | null
  category_id: string
  version: string
  status: DocumentStatus
  filename: string
  file_type: string
  file_size_bytes: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  chunk_id: string
  doc_id: string
  section_ref: string
  content_text: string
  error_codes: string[]
  keywords: string[]
  chunk_index: number
}

export interface DocumentDetail extends Document {
  category: Category | null
  chunks: DocumentChunk[]
}

export interface Feedback {
  feedback_id: string
  answer_id: string
  user_id: string
  rating: number
  flagged: boolean
  flag_reason: string | null
  flag_details: string | null
  flag_status: string
  reviewer_id: string | null
  reviewer_notes: string | null
  resolution_action: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  query_text: string | null
  answer_text: string | null
}

export type FlagStatus = 'none' | 'pending' | 'reviewed' | 'resolved' | 'dismissed' | (string & {})

export type ResolutionAction =
  | 'doc_updated'
  | 'doc_deprecated'
  | 'false_positive'
  | 'wont_fix'
  | null

export interface AuditLog {
  log_id: string
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  timestamp: string
}

export interface ErrorCodeStat {
  error_code: string
  count: number
  resolved_count: number
}

export interface DocumentationGap {
  query_text: string
  query_type: QueryType
  unresolved_count: number
  last_queried_at: string
}

export interface AnalyticsOverview {
  performance: {
    total_queries: number
    avg_latency_ms: number
    p95_latency_ms: number
    confident_percentage: number
    estimated_mttr_saved_minutes: number
  }
  document_stats: {
    total_documents: number
    active_documents: number
    deprecated_documents: number
    total_chunks: number
  }
  feedback_summary: {
    total_ratings: number
    helpful_count: number
    unhelpful_count: number
    helpful_percentage: number
    total_flags: number
    pending_flags: number
    resolved_flags: number
  }
  top_error_codes: ErrorCodeStat[]
  documentation_gaps: DocumentationGap[]
}
