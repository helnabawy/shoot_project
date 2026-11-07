// Framework-free and dependency-free so the browser bundle can use the same rules as the
// server without shipping a schema library (constitution Principle II: JS budget).

export type SlotKind = 'persona' | 'options' | 'date' | 'number'

export interface SlotRule {
  token: string
  kind: SlotKind
  required: boolean
  allowCustom?: boolean
  /** The visitor may pick several values, sent joined by MULTI_SEPARATOR (FR-063). */
  multiple?: boolean
  /** Values a visitor may pick; when absent any value is accepted. */
  allowedValues?: readonly string[]
}

export const CUSTOM_TEXT_MAX = 80
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Joins the values of a multiple slot. Values are slugs or option values, which never contain it. */
export const MULTI_SEPARATOR = ','

/** The values of a multiple slot, in the order picked, without blanks. */
export const splitMultiValue = (value: string): string[] =>
  value
    .split(MULTI_SEPARATOR)
    .map((v) => v.trim())
    .filter(Boolean)

export const joinMultiValue = (values: readonly string[]): string => splitMultiValue(values.join(MULTI_SEPARATOR)).join(MULTI_SEPARATOR)

/** Today's date in the business time zone (UAE), as YYYY-MM-DD. */
export function todayInZone(now: Date = new Date(), timeZone = 'Asia/Dubai'): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** The error key for one slot value, or null when it is valid (FR-050). */
export function checkSlot(slot: SlotRule, raw: string | undefined, today: string): string | null {
  const value = (raw ?? '').trim()
  if (slot.multiple && slot.kind !== 'date' && slot.kind !== 'number') return checkMultiple(slot, splitMultiValue(value))
  if (!value) return slot.required && slot.kind !== 'date' ? 'brief.errors.required' : null
  if (slot.kind === 'date') {
    if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) return 'brief.errors.dateInvalid'
    return value < today ? 'brief.errors.datePast' : null
  }
  if (slot.kind === 'number') {
    return /^\d{1,3}$/.test(value) && Number(value) >= 1 ? null : 'brief.errors.numberInvalid'
  }
  if (value.length > CUSTOM_TEXT_MAX) return 'brief.errors.tooLong'
  if (slot.allowedValues && !slot.allowCustom && !slot.allowedValues.includes(value)) return 'brief.errors.notAnOption'
  return null
}

function checkMultiple(slot: SlotRule, values: string[]): string | null {
  if (values.length === 0) return slot.required ? 'brief.errors.required' : null
  if (values.some((v) => v.length > CUSTOM_TEXT_MAX)) return 'brief.errors.tooLong'
  if (new Set(values).size !== values.length) return 'brief.errors.notAnOption'
  if (slot.allowedValues && values.some((v) => !slot.allowedValues?.includes(v))) return 'brief.errors.notAnOption'
  return null
}

/** Validates every slot; returns error keys by token (empty when the brief is valid). */
export function validateBrief(
  slots: readonly SlotRule[],
  values: Readonly<Record<string, string | undefined>>,
  options: { today?: string } = {},
): Record<string, string> {
  const today = options.today ?? todayInZone()
  const errors: Record<string, string> = {}
  for (const slot of slots) {
    const error = checkSlot(slot, values[slot.token], today)
    if (error) errors[slot.token] = error
  }
  return errors
}
