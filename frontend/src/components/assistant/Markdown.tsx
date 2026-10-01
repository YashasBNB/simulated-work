import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders the backend's grounded answer text.
 *
 * The backend's `synthesize_grounded_answer` emits GitHub-flavoured Markdown
 * (### headings, **bold**, `code`, ```bash blocks, > quotes, - bullets).
 * Raw HTML is not enabled, so backend content can never inject markup.
 */
export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed text-noc-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: c }) => (
            <h1 className="mt-4 mb-2 text-base font-semibold text-noc-900 first:mt-0">{c}</h1>
          ),
          h2: ({ children: c }) => (
            <h2 className="mt-4 mb-2 text-sm font-semibold text-noc-900 first:mt-0">{c}</h2>
          ),
          h3: ({ children: c }) => (
            <h3 className="mt-3 mb-1.5 text-sm font-semibold tracking-tight text-noc-900 first:mt-0">
              {c}
            </h3>
          ),
          h4: ({ children: c }) => (
            <h4 className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-noc-700 uppercase first:mt-0">
              {c}
            </h4>
          ),
          p: ({ children: c }) => <p className="my-1.5 first:mt-0 last:mb-0">{c}</p>,
          ul: ({ children: c }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 marker:text-noc-400">{c}</ul>
          ),
          ol: ({ children: c }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-noc-400">{c}</ol>
          ),
          li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
          strong: ({ children: c }) => <strong className="font-semibold text-noc-900">{c}</strong>,
          em: ({ children: c }) => <em className="text-noc-700 italic">{c}</em>,
          a: ({ children: c, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-ops-info underline">
              {c}
            </a>
          ),
          blockquote: ({ children: c }) => (
            <blockquote className="border-ops-info/40 bg-ops-info-bg my-3 rounded-r border-l-2 py-1.5 pr-2 pl-3 text-xs text-noc-700">
              {c}
            </blockquote>
          ),
          code: ({ children: c, className: codeClass }) => {
            const isBlock = typeof codeClass === 'string' && codeClass.includes('language-')
            if (isBlock) {
              return (
                <pre className="scrollbar-slim bg-noc-900 my-3 overflow-x-auto rounded-md border border-noc-800 p-3">
                  <code className="font-mono text-xs leading-relaxed text-noc-50">{c}</code>
                </pre>
              )
            }
            return (
              <code className="bg-noc-100 rounded border border-noc-200 px-1 py-0.5 font-mono text-[0.8em] text-noc-900">
                {c}
              </code>
            )
          },
          pre: ({ children: c }) => <>{c}</>,
          table: ({ children: c }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{c}</table>
            </div>
          ),
          th: ({ children: c }) => (
            <th className="border-b border-noc-200 px-2 py-1.5 font-semibold text-noc-700">{c}</th>
          ),
          td: ({ children: c }) => (
            <td className="border-b border-noc-100 px-2 py-1.5 align-top">{c}</td>
          ),
          hr: () => <hr className="border-noc-200 my-4" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
