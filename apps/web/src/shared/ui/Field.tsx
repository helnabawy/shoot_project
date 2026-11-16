import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './bar'

/**
 * A labelled input as a bar row: visible label, the control, and a one-sentence error right
 * beside it, linked with aria-describedby (FR-058).
 */
export function Field({
  id,
  label,
  hint,
  error,
  prefix,
  className,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** A fixed part shown before the value inside the same box (the phone fields' `+971`), read with the field. */
  prefix?: string
}) {
  const describedBy =
    [prefix ? `${id}-prefix` : null, error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
  const border = error ? 'border-on-attention/50' : 'border-hair'
  return (
    <div className={cx('px-4 py-2.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-mute">
        {label}
      </label>
      {prefix ? (
        <div
          dir="ltr"
          className={cx(
            'mt-1 flex min-h-11 w-full items-stretch overflow-hidden rounded-[var(--radius-row)] border transition-colors focus-within:border-[var(--focus)]',
            border,
          )}
        >
          <span id={`${id}-prefix`} className="flex items-center border-e border-hair px-3 text-[16px] text-ink tabular-nums">
            {prefix}
          </span>
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="block min-w-0 flex-1 bg-transparent px-3 text-[16px] text-ink outline-none placeholder:text-mute focus-visible:outline-none"
            {...input}
          />
        </div>
      ) : (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            'mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border bg-transparent px-3 text-[16px] text-ink outline-none transition-colors placeholder:text-mute focus-visible:border-[var(--focus)] focus-visible:outline-none',
            border,
          )}
          {...input}
        />
      )}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-[13px] text-mute">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  )
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 inline-block rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
      {children}
    </p>
  )
}

/** Form-level message (wrong password, locked account), announced to screen readers. */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mx-4 mt-3 rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention">
      {children}
    </p>
  )
}
