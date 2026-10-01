import { Link } from 'react-router-dom'
import type { Citation } from '../../types/api'
import { formatPercent } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { ChevronRightIcon, DocumentIcon } from '../ui/Button'
import { Disclosure } from '../ui/Table'

/**
 * Source citations for a confident answer.
 *
 * PRD requirement: every confident answer must expose document title, version
 * and section reference. Each card links to the document detail view so an
 * engineer can verify the cited section in the runbook itself.
 */
export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) {
    return (
      <p className="text-ops-critical bg-ops-critical-bg rounded-md border border-ops-critical/25 px-3 py-2 text-xs">
        No citations were returned with this answer. Treat it as unverified and escalate.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {citations.map((citation, index) => (
        <li key={citation.chunk_id}>
          <Disclosure
            defaultOpen={index === 0}
            summary={
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="bg-noc-900 flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-noc-50">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-noc-900">
                  {citation.title}
                </span>
                <Badge tone="muted">v{citation.version}</Badge>
                <Badge
                  tone={citation.relevance_score >= 0.35 ? 'success' : 'neutral'}
                  title={`Retrieval relevance score`}
                >
                  {formatPercent(citation.relevance_score, 1)}
                </Badge>
              </span>
            }
          >
            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">
                  Section reference
                </dt>
                <dd className="mt-0.5 font-mono text-xs break-words text-noc-900">
                  {citation.section_ref}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">Vendor</dt>
                <dd className="mt-0.5 text-xs break-words text-noc-800">
                  {citation.vendor ?? 'Internal'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">
                  Category
                </dt>
                <dd className="mt-0.5 text-xs break-words text-noc-800">
                  {citation.category_name ?? citation.category_id}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">
                  Identifiers
                </dt>
                <dd className="mt-0.5 font-mono text-[11px] break-all text-noc-500">
                  {citation.doc_id} · {citation.chunk_id}
                </dd>
              </div>
            </dl>
            <div className="mt-2.5">
              <p className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">
                Cited excerpt
              </p>
              <pre className="scrollbar-slim bg-noc-50 mt-1 max-h-40 overflow-auto rounded border border-noc-200 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-noc-700">
                {citation.snippet}
              </pre>
            </div>
            <Link
              to={`/documents/${citation.doc_id}`}
              className="text-ops-info mt-2.5 inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <DocumentIcon className="size-3.5" />
              Open source document
              <ChevronRightIcon className="size-3" />
            </Link>
          </Disclosure>
        </li>
      ))}
    </ul>
  )
}
