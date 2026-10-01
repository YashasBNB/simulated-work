import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deprecateDocument, listCategories, listDocuments, uploadDocument } from '../api/documents'
import { useAuth } from '../auth/authContext'
import { hasCapability } from '../auth/rbac'
import { useAsyncResource, useMutation } from '../hooks/useAsyncResource'
import { formatBytes, formatDateTime } from '../lib/format'
import type { Category, Document } from '../types/api'
import { Card, CardBody, PageHeader } from '../components/ui/Card'
import {
  AlertIcon,
  Button,
  DocumentIcon,
  RefreshIcon,
  UploadIcon,
} from '../components/ui/Button'
import { DocumentStatusBadge } from '../components/ui/Badge'
import { Select, TextArea, TextInput } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { EmptyState, InlineNotice, TableSkeleton } from '../components/ui/States'
import { DataTable } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'] as const

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active only' },
  { value: 'deprecated', label: 'Deprecated only' },
]

/**
 * Document library: list, upload and deprecate runbooks.
 * GET /api/v1/documents is already RBAC-filtered server-side.
 */
export function DocumentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const roleId = user?.role_id ?? ''
  const canUpload = hasCapability(roleId, 'uploadDocuments')
  const canDeprecate = hasCapability(roleId, 'deprecateDocuments')

  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deprecateTarget, setDeprecateTarget] = useState<Document | null>(null)

  const documents = useAsyncResource<Document[]>(
    (signal) =>
      listDocuments({
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
        vendor: vendorFilter || undefined,
        signal,
      }),
    [statusFilter, categoryFilter, vendorFilter],
  )

  const categories = useAsyncResource<Category[]>((signal) => listCategories(signal), [])

  const rows = documents.data ?? []

  const columns: Column<Document>[] = [
    {
      key: 'title',
      header: 'Document',
      cell: (doc) => (
        <div className="min-w-0">
          <p className="text-sm font-medium break-words text-noc-900">{doc.title}</p>
          <p className="text-noc-500 mt-0.5 font-mono text-[10px] break-all">{doc.doc_id}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (doc) => {
        const category = categories.data?.find((c) => c.category_id === doc.category_id)
        return (
          <div className="min-w-0">
            <p className="text-xs break-words text-noc-800">{category?.name ?? doc.category_id}</p>
            <p className="text-noc-500 mt-0.5 text-[10px]">{doc.vendor ?? 'Internal'}</p>
          </div>
        )
      },
      hideBelow: 'md',
    },
    {
      key: 'version',
      header: 'Version',
      cell: (doc) => <span className="font-mono text-xs whitespace-nowrap text-noc-800">{doc.version}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (doc) => <DocumentStatusBadge status={doc.status} />,
    },
{
        key: 'file',
        header: 'File',
        cell: (doc) => (
          <div className="min-w-32 text-[11px] text-noc-600">
            <p className="truncate font-mono" title={doc.filename}>
              {doc.filename}
            </p>
            <p className="text-noc-500">
              {doc.file_type.toUpperCase()} · {formatBytes(doc.file_size_bytes)}
            </p>
          </div>
        ),
        hideBelow: 'xl',
      },
    {
      key: 'created',
      header: 'Created (UTC)',
      cell: (doc) => (
        <span className="tabular text-xs whitespace-nowrap text-noc-700">
          {formatDateTime(doc.created_at)}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'sr-only',
      cell: (doc) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/documents/${doc.doc_id}`)
            }}
          >
            Sections
          </Button>
          {canDeprecate && doc.status.toLowerCase() !== 'deprecated' ? (
            <Button
              size="sm"
              variant="secondary"
              className="text-ops-critical"
              onClick={(event) => {
                event.stopPropagation()
                setDeprecateTarget(doc)
              }}
            >
              Deprecate
            </Button>
          ) : null}
        </div>
      ),
      className: 'text-right',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Runbook library available to your role. Deprecated documents are excluded from incident search."
        actions={
          <>
            <Button variant="secondary" onClick={documents.reload} loading={documents.refreshing}>
              <RefreshIcon className="size-3.5" />
              Refresh
            </Button>
            {canUpload ? (
              <Button variant="primary" onClick={() => setUploadOpen(true)}>
                <UploadIcon className="size-3.5" />
                Upload runbook
              </Button>
            ) : null}
          </>
        }
      />

      <div className="px-5 py-4">
        {!canUpload ? (
          <InlineNotice tone="info" className="mb-3">
            Your role can read this library. Upload and deprecation are limited to Content Admins and
            System Admins.
          </InlineNotice>
        ) : null}

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            options={[
              { value: '', label: 'All categories' },
              ...(categories.data ?? []).map((cat) => ({ value: cat.category_id, label: cat.name })),
            ]}
          />
          <TextInput
            label="Vendor contains"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
            placeholder="e.g. Cisco"
            autoComplete="off"
          />
        </div>

        <Card>
          {documents.loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : documents.error ? (
            <CardBody>
              <InlineNotice tone="critical">
                {documents.error}
                <div className="mt-2">
                  <Button size="sm" variant="secondary" onClick={documents.reload}>
                    <RefreshIcon className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </InlineNotice>
            </CardBody>
          ) : (
            <DataTable
              caption="Documents visible to your role"
              columns={columns}
              rows={rows}
              rowKey={(doc) => doc.doc_id}
              onRowClick={(doc) => navigate(`/documents/${doc.doc_id}`)}
              emptyState={
                <EmptyState
                  title="No documents match"
                  description="Adjust the filters, or upload a runbook if your role allows it."
                  icon={<DocumentIcon className="size-7" />}
                />
              }
            />
          )}
        </Card>

        {!documents.loading && !documents.error ? (
          <p className="text-noc-500 mt-2 text-[11px]">
            {rows.length} document{rows.length === 1 ? '' : 's'} visible to your role ·{' '}
            {rows.filter((d) => d.status.toLowerCase() === 'active').length} active ·{' '}
            {rows.filter((d) => d.status.toLowerCase() === 'deprecated').length} deprecated
          </p>
        ) : null}
      </div>

      {canUpload ? (
        <UploadModal
          open={uploadOpen}
          categories={categories.data ?? []}
          onClose={() => setUploadOpen(false)}
          onUploaded={(docId) => {
            setUploadOpen(false)
            documents.reload()
            navigate(`/documents/${docId}`)
          }}
        />
      ) : null}

      {deprecateTarget ? (
        <DeprecateModal
          document={deprecateTarget}
          documents={rows}
          onClose={() => setDeprecateTarget(null)}
          onDeprecated={() => {
            setDeprecateTarget(null)
            documents.reload()
          }}
        />
      ) : null}
    </div>
  )
}

function UploadModal({
  open,
  categories,
  onClose,
  onUploaded,
}: {
  open: boolean
  categories: Category[]
  onClose: () => void
  onUploaded: (docId: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [vendor, setVendor] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [formError, setFormError] = useState<string | null>(null)

  const upload = useMutation(() => {
    if (!file) throw new Error('A file is required.')
    return uploadDocument({
      file,
      title: title.trim(),
      category_id: categoryId,
      vendor,
      version: version.trim() || '1.0.0',
    })
  })

  useEffect(() => {
    if (!open) {
      setFile(null)
      setTitle('')
      setCategoryId('')
      setVendor('')
      setVersion('1.0.0')
      setFormError(null)
      upload.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) {
      setFormError('Choose a runbook file to upload.')
      return
    }
    if (!title.trim()) {
      setFormError('A document title is required.')
      return
    }
    if (!categoryId) {
      setFormError('Select a category. The backend rejects unknown categories with 400.')
      return
    }
    setFormError(null)
    const result = await upload.run()
    if (result) onUploaded(result.doc_id)
  }

  const fileExtension = file ? `.${file.name.split('.').pop()?.toLowerCase() ?? ''}` : ''
  const unsupported = Boolean(file) && !ACCEPTED_EXTENSIONS.includes(fileExtension as never)

  return (
    <Modal
      open={open}
      title="Upload and index runbook"
      description="The backend parses the file, extracts sections, error codes and keywords, then indexes it for retrieval."
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={upload.pending} loadingLabel="Uploading…" onClick={handleSubmit}>
            <UploadIcon className="size-3.5" />
            Upload and index
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="upload-file" className="text-xs font-medium text-noc-700">
            Runbook file<span className="text-ops-critical ml-0.5">*</span>
          </label>
          <input
            id="upload-file"
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="border-noc-300 text-noc-700 file:border-noc-300 w-full rounded-md border bg-white px-2.5 py-1.5 text-xs file:mr-2 file:rounded file:border file:bg-noc-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-noc-800"
          />
          <p className="text-[11px] leading-relaxed text-noc-500">
            Accepted by the backend: {ACCEPTED_EXTENSIONS.join(', ')}. Anything else returns 400.
          </p>
          {unsupported ? (
            <InlineNotice tone="critical">
              <span className="inline-flex items-center gap-1">
                <AlertIcon className="size-3.5" />
                {fileExtension || 'This file type'} is not supported by the ingestion service.
              </span>
            </InlineNotice>
          ) : null}
          {file ? (
            <p className="text-noc-600 font-mono text-[11px]">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : null}
        </div>

        <TextInput
          label="Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Cisco IOS XE Core Switch Recovery Runbook"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Category"
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={[
              { value: '', label: 'Select a category…' },
              ...categories.map((cat) => ({ value: cat.category_id, label: `${cat.name} (${cat.category_id})` })),
            ]}
            hint={
              categoryId
                ? categories.find((c) => c.category_id === categoryId)?.description ??
                  undefined
                : undefined
            }
          />
          <TextInput
            label="Vendor"
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
            placeholder="Defaults to the category vendor"
            autoComplete="off"
          />
        </div>

        <TextInput
          label="Version"
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          placeholder="1.0.0"
          hint="Shown on every citation. Default 1.0.0."
          className="sm:max-w-48"
        />

        {formError ? <InlineNotice tone="critical">{formError}</InlineNotice> : null}
        {upload.error ? <InlineNotice tone="critical">{upload.error}</InlineNotice> : null}
      </form>
    </Modal>
  )
}

function DeprecateModal({
  document: target,
  documents,
  onClose,
  onDeprecated,
}: {
  document: Document
  documents: Document[]
  onClose: () => void
  onDeprecated: () => void
}) {
  const [reason, setReason] = useState('')
  const [replacementDocId, setReplacementDocId] = useState('')

  const deprecate = useMutation(() =>
    deprecateDocument(target.doc_id, {
      reason: reason.trim() || 'Deprecated by administrator',
      replacement_doc_id: replacementDocId || null,
    }),
  )

  const candidates = documents.filter(
    (doc) => doc.doc_id !== target.doc_id && doc.category_id === target.category_id,
  )

  return (
    <Modal
      open
      title="Deprecate runbook"
      description="Deprecated documents are immediately excluded from incident search results. This cannot be undone from the UI."
      onClose={onClose}
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deprecate.pending}
            loadingLabel="Deprecating…"
            onClick={async () => {
              const result = await deprecate.run()
              if (result) onDeprecated()
            }}
          >
            Deprecate document
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="border-ops-critical/25 bg-ops-critical-bg rounded-md border px-3 py-2.5">
          <p className="text-xs leading-relaxed text-noc-800">
            <span className="font-semibold">{target.title}</span>{' '}
            <span className="font-mono text-[11px]">
              ({target.doc_id}, v{target.version})
            </span>{' '}
            will stop appearing in incident answers. Citations that already reference it remain
            readable in history.
          </p>
        </div>
        <TextArea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Replaced by the v5.x core switch runbook after the June topology change."
          hint="Sent to the backend as `reason` and written to the audit log."
        />
        <Select
          label="Replacement document (optional)"
          value={replacementDocId}
          onChange={(event) => setReplacementDocId(event.target.value)}
          options={[
            { value: '', label: 'No replacement' },
            ...candidates.map((doc) => ({ value: doc.doc_id, label: `${doc.title} (v${doc.version})` })),
          ]}
          hint={
            candidates.length === 0
              ? 'No other active document exists in this category.'
              : undefined
          }
        />
        {deprecate.error ? <InlineNotice tone="critical">{deprecate.error}</InlineNotice> : null}
      </div>
    </Modal>
  )
}

