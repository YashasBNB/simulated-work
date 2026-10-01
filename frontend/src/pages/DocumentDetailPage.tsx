import { Link, useParams } from 'react-router-dom'
import { getDocument, listCategories } from '../api/documents'
import { useAsyncResource } from '../hooks/useAsyncResource'
import { formatBytes, formatDateTime, truncate } from '../lib/format'
import type { Category, DocumentDetail } from '../types/api'
import { PageHeader, Card, CardBody, CardHeader, MetaItem } from '../components/ui/Card'
import { AlertIcon, ChevronRightIcon, DocumentIcon } from '../components/ui/Button'
import { Badge, DocumentStatusBadge } from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { Disclosure } from '../components/ui/Table'

/** GET /api/v1/documents/{doc_id} — full detail including parsed chunks. */
export function DocumentDetailPage() {
  const { docId = '' } = useParams()
  const doc = useAsyncResource<DocumentDetail>((signal) => getDocument(docId, signal), [docId])
  const categories = useAsyncResource<Category[]>((signal) => listCategories(signal), [])

  if (doc.loading) {
    return (
      <div>
        <PageHeader title="Document" />
        <LoadingState label="Loading document…" />
      </div>
    )
  }

  if (doc.error || !doc.data) {
    return (
      <div>
        <PageHeader title="Document" />
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          <ErrorState
            error={doc.error}
            onRetry={doc.reload}
          />
          <Link
            to="/documents"
            className="text-ops-info mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <ChevronRightIcon className="size-3 rotate-180" />
            Back to documents
          </Link>
        </div>
      </div>
    )
  }

  const data = doc.data
  const category = data.category ?? categories.data?.find((c) => c.category_id === data.category_id)

  return (
    <div>
      <PageHeader
        title={data.title}
        description={`Source document for cited answers · ${data.filename}`}
        actions={
          <>
            <DocumentStatusBadge status={data.status} />
            <Badge tone="muted">v{data.version}</Badge>
            <Link
              to="/documents"
              className="text-ops-info inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <ChevronRightIcon className="size-3 rotate-180" />
              All documents
            </Link>
          </>
        }
      />

      <div className="mx-auto w-full max-w-5xl space-y-4 px-5 py-4">
        <Card>
          <CardHeader title="Document metadata" icon={<DocumentIcon />} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetaItem label="Document ID" value={data.doc_id} mono />
              <MetaItem label="Version" value={data.version} />
              <MetaItem label="Vendor" value={data.vendor ?? 'Internal'} />
              <MetaItem
                label="Category"
                value={category?.name ?? data.category_id}
              />
              <MetaItem label="File" value={data.filename} mono />
              <MetaItem label="File type" value={data.file_type.toUpperCase()} />
              <MetaItem label="Size" value={formatBytes(data.file_size_bytes)} />
              <MetaItem label="Uploaded by" value={data.uploaded_by ?? '—'} mono />
              <MetaItem label="Created (UTC)" value={formatDateTime(data.created_at)} />
              <MetaItem label="Updated (UTC)" value={formatDateTime(data.updated_at)} />
            </dl>
            {category?.description ? (
              <p className="text-noc-600 mt-3 border-t border-noc-100 pt-3 text-xs leading-relaxed">
                {category.description}
              </p>
            ) : null}
            {data.status.toLowerCase() === 'deprecated' ? (
              <p className="border-ops-critical/25 bg-ops-critical-bg text-ops-critical mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
                <AlertIcon className="mt-0.5 size-3.5" />
                This runbook is deprecated and is excluded from incident search results. It is
                retained for audit and historical citation only.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Indexed sections"
            description={`${data.chunks.length} chunk${data.chunks.length === 1 ? '' : 's'} produced by the ingestion engine. Citations in answers point at these sections.`}
            actions={<Badge tone="neutral">{data.chunks.length}</Badge>}
          />
          <CardBody>
            {data.chunks.length === 0 ? (
              <EmptyState
                compact
                title="No indexed sections"
                description="The ingestion engine did not extract any sections from this file."
                icon={<DocumentIcon className="size-6" />}
              />
            ) : (
              <ul className="space-y-2">
                {data.chunks.map((chunk) => (
                  <li key={chunk.chunk_id}>
                    <Disclosure
                      summary={
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <span className="min-w-0 flex-1 truncate font-mono text-noc-900">
                            {chunk.section_ref}
                          </span>
                          {chunk.error_codes.length > 0 ? (
                            <Badge tone="info">{chunk.error_codes.length} error codes</Badge>
                          ) : null}
                        </span>
                      }
                    >
                      <div className="space-y-2">
                        <pre className="scrollbar-slim bg-noc-50 max-h-80 overflow-auto rounded border border-noc-200 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-noc-800">
                          {chunk.content_text}
                        </pre>
                        {chunk.error_codes.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-noc-500 text-[11px] font-medium tracking-wide uppercase">
                              Error codes
                            </span>
                            {chunk.error_codes.map((code) => (
                              <span
                                key={code}
                                className="border-ops-info/30 bg-ops-info-bg rounded border px-1.5 py-0.5 font-mono text-[11px] text-ops-info"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {chunk.keywords.length > 0 ? (
                          <div>
                            <span className="text-noc-500 text-[11px] font-medium tracking-wide uppercase">
                              Keywords
                            </span>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-noc-600">
                              {truncate(chunk.keywords.join(', '), 400)}
                            </p>
                          </div>
                        ) : null}
                        <p className="text-noc-500 font-mono text-[10px] break-all">
                          {chunk.chunk_id} · index {chunk.chunk_index}
                        </p>
                      </div>
                    </Disclosure>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {doc.refreshing ? (
          <p className="text-noc-500 text-[11px]">Refreshing document…</p>
        ) : null}
      </div>
    </div>
  )
}
