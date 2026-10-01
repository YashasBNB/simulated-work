import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'aside'
}) {
  return (
    <Tag className={`rounded-lg border border-noc-200 bg-white ${className}`}>{children}</Tag>
  )
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className = '',
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <header
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-noc-200 px-4 py-3 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-noc-500">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-noc-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-noc-600">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-noc-200 bg-white px-5 py-4">
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight text-noc-900">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-noc-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** Definition-list row used for metadata panels. */
export function MetaItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-medium tracking-wide text-noc-500 uppercase">{label}</dt>
      <dd className={`text-sm break-words text-noc-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
