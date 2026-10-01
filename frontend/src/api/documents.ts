import { apiRequest } from './client'
import type { Category, Document, DocumentDetail } from '../types/api'

/** GET /api/v1/documents — RBAC-filtered list. Optional status/category/vendor filters. */
export function listDocuments(
  params: {
    status?: string
    category_id?: string
    vendor?: string
    signal?: AbortSignal
  } = {},
): Promise<Document[]> {
  return apiRequest<Document[]>('/api/v1/documents', {
    query: {
      status: params.status,
      category_id: params.category_id,
      vendor: params.vendor,
    },
    signal: params.signal,
  })
}

/** GET /api/v1/documents/{doc_id} — document plus parsed chunks. */
export function getDocument(docId: string, signal?: AbortSignal): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(`/api/v1/documents/${encodeURIComponent(docId)}`, { signal })
}

/** GET /api/v1/documents/categories — all ingest categories. */
export function listCategories(signal?: AbortSignal): Promise<Category[]> {
  return apiRequest<Category[]>('/api/v1/documents/categories', { signal })
}

export interface UploadDocumentInput {
  file: File
  title: string
  category_id: string
  vendor?: string
  version?: string
}

/**
 * POST /api/v1/documents/upload — multipart/form-data.
 * Fields: file, title, category_id, vendor (optional), version (defaults to 1.0.0).
 * Backend answers 400 for an unknown category or an unsupported extension, and
 * 403 when the caller's role is not content_admin / system_admin.
 */
export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentDetail> {
  const form = new FormData()
  form.append('file', input.file)
  form.append('title', input.title)
  form.append('category_id', input.category_id)
  form.append('version', input.version?.trim() || '1.0.0')
  if (input.vendor?.trim()) form.append('vendor', input.vendor.trim())

  return apiRequest<DocumentDetail>('/api/v1/documents/upload', {
    method: 'POST',
    formData: form,
  })
}

/** POST /api/v1/documents/{doc_id}/deprecate — exclude a runbook from search results. */
export function deprecateDocument(
  docId: string,
  body: { reason?: string | null; replacement_doc_id?: string | null } = {},
): Promise<Document> {
  return apiRequest<Document>(`/api/v1/documents/${encodeURIComponent(docId)}/deprecate`, {
    method: 'POST',
    body: {
      reason: body.reason ?? 'Deprecated by administrator',
      replacement_doc_id: body.replacement_doc_id ?? null,
    },
  })
}
