import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ops-info text-white hover:bg-ops-info/90',
  secondary: 'border border-noc-300 bg-white text-noc-800 hover:bg-noc-50',
  ghost: 'text-noc-700 hover:bg-noc-100',
  danger: 'bg-ops-critical text-white hover:bg-ops-critical/90',
  success: 'border border-ops-healthy/40 bg-ops-healthy-bg text-ops-healthy hover:bg-ops-healthy/10',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9.5 px-3.5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  loadingLabel?: string
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  loadingLabel,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="size-3.5" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
      />
    </svg>
  )
}

export interface IconProps {
  className?: string
}

const ICON = 'size-4 shrink-0'

export function TerminalIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DocumentIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  )
}

export function FlagIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5.5 21V4M5.5 5h11l-2 3.5 2 3.5h-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChartIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h16" strokeLinecap="round" />
      <path d="M7 20v-6M12 20V7M17 20v-9" strokeLinecap="round" />
    </svg>
  )
}

export function ShieldIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SearchIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  )
}

export function AlertIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4.5 21 19H3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 16.5v.01" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ThumbUpIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 10.5 11 3a2.5 2.5 0 0 1 2.4 3.2L12.7 10h4.6a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 16 20H7z" strokeLinejoin="round" />
      <path d="M7 10.5H4.5V20H7z" strokeLinejoin="round" />
    </svg>
  )
}

export function ThumbDownIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 13.5 11 21a2.5 2.5 0 0 0 2.4-3.2l-.7-3.8h4.6a2 2 0 0 0 2-2.4l-1.3-6A2 2 0 0 0 16 4H7z" strokeLinejoin="round" />
      <path d="M7 13.5H4.5V4H7z" strokeLinejoin="round" />
    </svg>
  )
}

export function UploadIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" strokeLinecap="round" />
    </svg>
  )
}

export function LinkIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 13.5a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" strokeLinecap="round" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronDownIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9.5 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-2.3 6.1" strokeLinecap="round" />
      <path d="M20 5v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CopyIcon({ className = ICON }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" strokeLinecap="round" />
    </svg>
  )
}

export interface ButtonRowProps {
  children: ReactNode
  className?: string
}

export function ButtonRow({ children, className = '' }: ButtonRowProps) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
}
