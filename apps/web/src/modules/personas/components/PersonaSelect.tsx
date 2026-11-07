import { cx } from '@/shared/ui/bar'
import { FieldError } from '@/shared/ui/Field'

export interface PersonaOption {
  slug: string
  label: string
}

/** Professional type for provider accounts, listing only the active personas (FR-019, FR-027). */
export function PersonaSelect({
  id,
  label,
  placeholder,
  emptyMessage,
  options,
  defaultValue,
  error,
}: {
  id: string
  label: string
  placeholder: string
  emptyMessage: string
  options: PersonaOption[]
  defaultValue?: string
  error?: string
}) {
  if (options.length === 0) {
    return <p className="px-4 py-2.5 text-[14px] text-mute">{emptyMessage}</p>
  }
  return (
    <div className="px-4 py-2.5" data-testid="persona-select">
      <label htmlFor={id} className="block text-[13px] font-medium text-mute">
        {label}
      </label>
      <select
        id={id}
        name="persona"
        defaultValue={defaultValue ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx('mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border bg-transparent px-3 text-[16px] text-ink', error ? 'border-on-attention/50' : 'border-hair')}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  )
}
