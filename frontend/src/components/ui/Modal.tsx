import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon } from './Button'

export interface ModalProps {
  open: boolean
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
} as const

/** Accessible dialog: focus trap entry, Escape to close, backdrop click to close. */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = 'md',
}: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-noc-950/45 p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`relative z-10 w-full ${WIDTHS[width]} rounded-lg border border-noc-200 bg-white shadow-xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-noc-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-noc-900">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-xs leading-relaxed text-noc-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-noc-500 hover:bg-noc-100 rounded p-1 hover:text-noc-800"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="scrollbar-slim max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-noc-200 bg-noc-50 px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
