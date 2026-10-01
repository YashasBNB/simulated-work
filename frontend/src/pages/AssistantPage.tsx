import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listCategories } from '../api/documents'
import { getQueryHistory, runQuery } from '../api/query'
import { useAuth } from '../auth/authContext'
import { isCategoryPermitted } from '../auth/rbac'
import { useAsyncResource, useMutation } from '../hooks/useAsyncResource'
import type { Answer, Category } from '../types/api'
import { PageHeader } from '../components/ui/Card'
import { Button, SearchIcon } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { EmptyState, ErrorState, InlineNotice } from '../components/ui/States'
import { AnswerLoadingSkeleton, AnswerPanel } from '../components/assistant/AnswerPanel'

const EXAMPLES = [
  'CrashLoopBackOff',
  'HTTP 504 gateway timeout',
  'PostgreSQL replication lag',
  'ERR_CONNECTION_REFUSED',
]

/**
 * Incident Assistant — the primary troubleshooting screen.
 *
 * Query state lives in the URL (`?q=…&category=…`) so a result can be shared
 * or bookmarked mid-incident. All results come from the real backend.
 */
export function AssistantPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState(searchParams.get('q') ?? '')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const queryText = searchParams.get('q') ?? ''
  const categoryFilter = searchParams.get('category') ?? ''

  const categories = useAsyncResource<Category[]>((signal) => listCategories(signal), [])

  // Only offer categories this role may actually search.
  const permittedCategories = useMemo(() => {
    const permitted = user?.role?.permitted_categories ?? []
    if (permitted.includes('*')) return categories.data ?? []
    return (categories.data ?? []).filter((cat) => isCategoryPermitted(permitted, cat.category_id))
  }, [categories.data, user])

  const submit = useMutation((text: string, category: string) =>
    runQuery({ query_text: text, category_filter: category || null }),
  )

  // Deep-link support: restore the answer for ?q=… from the history endpoint.
  useEffect(() => {
    if (!queryText || answer || submit.pending) return
    let cancelled = false
    void (async () => {
      try {
        const history = await getQueryHistory({ limit: 25 })
        if (cancelled) return
        const match = history.find((item) => item.query_text === queryText && item.answer)
        if (match?.answer) setAnswer(match.answer)
      } catch {
        /* restoring is best-effort — the engineer can simply re-run the query */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryText])

  const updateParams = (text: string, category: string) => {
    const next = new URLSearchParams()
    if (text) next.set('q', text)
    if (category) next.set('category', category)
    setSearchParams(next, { replace: true })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      setValidationError('Enter a question or an error code before searching.')
      return
    }
    setValidationError(null)
    setAnswer(null)
    updateParams(text, categoryFilter)

    const result = await submit.run(text, categoryFilter)
    if (result) {
      setAnswer(result)
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <div>
      <PageHeader
        title="Incident Assistant"
        description="Search authorized runbooks with natural language or an error code. Every confident answer is grounded and carries source citations."
      />

      <div className="mx-auto w-full max-w-5xl px-5 py-5">
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="incident-query" className="sr-only">
                Incident question or error code
              </label>
              <div className="relative">
                <span className="text-noc-400 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                  <SearchIcon />
                </span>
                <input
                  id="incident-query"
                  type="search"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Describe the symptom or paste an error code…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={validationError ? true : undefined}
                  className={`focus:border-ops-info h-11 w-full rounded-md border bg-white pr-3 pl-9 text-sm text-noc-900 placeholder:text-noc-400 ${
                    validationError ? 'border-ops-critical' : 'border-noc-300'
                  }`}
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              loading={submit.pending}
              loadingLabel="Searching…"
              className="h-11 self-end px-5"
            >
              <SearchIcon />
              Search runbooks
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="sm:w-80">
              {categories.loading ? (
                <div className="h-9 animate-pulse rounded-md border border-noc-300 bg-noc-100" />
              ) : (
                <Select
                  label="Restrict to category (optional)"
                  value={categoryFilter}
                  onChange={(event) => updateParams(draft.trim(), event.target.value)}
                  options={[
                    { value: '', label: 'All permitted categories' },
                    ...permittedCategories.map((cat) => ({ value: cat.category_id, label: cat.name })),
                  ]}
                  hint="Limited to the categories your role is authorized to search."
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-noc-500 text-[11px]">Try:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setDraft(example)}
                  className="border-noc-300 text-noc-700 hover:bg-noc-50 rounded border bg-white px-2 py-0.5 font-mono text-[11px] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {validationError ? (
            <InlineNotice tone="critical" className="max-w-2xl">
              {validationError}
            </InlineNotice>
          ) : null}
          {submit.error ? (
            <InlineNotice tone="critical" className="max-w-2xl">
              {submit.error}
            </InlineNotice>
          ) : null}
        </form>

        <div ref={resultsRef} className="mt-5 scroll-mt-4">
          {submit.pending ? <AnswerLoadingSkeleton /> : null}

          {!submit.pending && answer ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">Result</Badge>
                <span className="text-noc-500 text-[11px]">
                  Answer ID <span className="font-mono">{answer.answer_id}</span>
                </span>
              </div>
              <AnswerPanel answer={answer} />
            </>
          ) : null}

          {!submit.pending && !answer ? (
            <div className="rounded-lg border border-noc-200 bg-white">
              {categories.error ? (
                <div className="p-4">
                  <ErrorState error={categories.error} onRetry={categories.reload} compact />
                </div>
              ) : (
                <EmptyState
                  title="Start an incident investigation"
                  description="Enter a natural-language question or paste an error code such as CrashLoopBackOff, HTTP 504, ORA-01017 or ERR_CONNECTION_REFUSED. Results are restricted to the runbook categories your role is authorized to search."
                  icon={<SearchIcon className="size-7" />}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
