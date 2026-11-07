import { cx, rowClass } from '@/shared/ui/bar'
import { CheckIcon } from '@/shared/ui/icons'

/**
 * A choice as a bar row: a label over a visually hidden checkbox (so it is a plain form without
 * JavaScript), the tile fills selection blue with a tick when chosen and the row is tinted.
 */
export function CheckRow({
  name,
  value,
  label,
  form,
  defaultChecked,
  disabled,
  onChange,
  indent,
  testId,
}: {
  name: string
  value: string
  label: string
  /** The id of the form the choice belongs to (the form element may sit elsewhere on the page). */
  form: string
  defaultChecked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  /** A city under its emirate. */
  indent?: boolean
  testId?: string
}) {
  return (
    <label
      className={cx(rowClass('open'), 'has-[:checked]:bg-selected has-[:checked]:font-semibold has-[:checked]:hover:bg-selected-hover', disabled && 'hidden', indent && 'ms-5')}
      data-testid={testId}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        form={form}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="grid size-[30px] shrink-0 place-items-center rounded-[var(--radius-tile)] border border-mute bg-tile text-tile-ink peer-checked:border-transparent peer-checked:bg-accent peer-checked:text-on-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <CheckIcon width={15} height={15} />
      </span>
      <span className="min-w-0 break-words">{label}</span>
      <span />
    </label>
  )
}
