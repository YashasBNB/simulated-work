import type { ReactNode } from 'react'
import { ChevronDownIcon } from './Button'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Cell renderer. */
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
  /** Hide below the given breakpoint to keep narrow viewports readable. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const HIDE_CLASS = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const

export interface DataTableProps<T> {
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
  dense?: boolean
}

/**
 * Accessible enterprise table: real <table> markup, sticky header, zebra-free
 * but hover-highlighted rows, optional click-through rows.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  dense = false,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  const pad = dense ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div className="scrollbar-slim w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-noc-200 bg-noc-50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${pad} text-[11px] font-semibold tracking-wide text-noc-600 uppercase whitespace-nowrap ${
                  col.hideBelow ? HIDE_CLASS[col.hideBelow] : ''
                } ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-noc-100">
          {/*
            Rows get a mouse click affordance only. We deliberately do not set
            role="button"/tabIndex on <tr>: rows commonly contain their own
            buttons, and nesting interactive roles breaks screen readers and
            keyboard navigation. Row actions expose a real button instead.
          */}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`align-top transition-colors ${
                onRowClick ? 'hover:bg-ops-info-bg/50' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${pad} text-noc-800 ${col.hideBelow ? HIDE_CLASS[col.hideBelow] : ''} ${col.className ?? ''}`}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface DisclosureProps {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/** Native <details> disclosure: keyboard accessible, no JS state required. */
export function Disclosure({ summary, children, defaultOpen = false, className = '' }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={`group rounded-md border border-noc-200 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-noc-700 select-none hover:bg-noc-50">
        {summary}
        <ChevronDownIcon className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-noc-200 px-3 py-2.5">{children}</div>
    </details>
  )
}
