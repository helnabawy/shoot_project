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
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode; hint?: ReactNode; error?: ReactNode }) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('px-4 py-2.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-mute">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border bg-transparent px-3 text-[16px] text-ink outline-none transition-colors placeholder:text-mute focus-visible:border-[var(--focus)] focus-visible:outline-none',
          error ? 'border-on-attention/50' : 'border-hair',
        )}
        {...input}
      />
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
