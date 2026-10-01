import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const FIELD_BASE =
  'w-full rounded-md border border-noc-300 bg-white px-2.5 text-sm text-noc-900 placeholder:text-noc-400 disabled:cursor-not-allowed disabled:bg-noc-100 disabled:text-noc-500'

export interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = '',
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-noc-700">
        {label}
        {required ? <span className="text-ops-critical ml-0.5">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-[11px] leading-relaxed text-noc-500">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-ops-critical text-[11px] leading-relaxed">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({
  label,
  hint,
  error,
  className = '',
  ...rest
}: { label: string; hint?: ReactNode; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={rest.required}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={`${FIELD_BASE} h-9 ${error ? 'border-ops-critical' : ''} ${className}`}
        {...rest}
      />
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  error,
  className = '',
  ...rest
}: { label: string; hint?: ReactNode; error?: string | null } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={rest.required}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className={`${FIELD_BASE} scrollbar-slim py-2 leading-relaxed ${
          error ? 'border-ops-critical' : ''
        } ${className}`}
        {...rest}
      />
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export function Select({
  label,
  hint,
  error,
  options,
  className = '',
  ...rest
}: {
  label: string
  hint?: ReactNode
  error?: string | null
  options: SelectOption[]
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={rest.required}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={`${FIELD_BASE} h-9 ${error ? 'border-ops-critical' : ''} ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
