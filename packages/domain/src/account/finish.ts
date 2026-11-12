export const FINISH_ITEMS = ['number', 'name', 'email'] as const
export type FinishItemKey = (typeof FINISH_ITEMS)[number]

export interface FinishItem {
  key: FinishItemKey
  done: boolean
  /** The number, name or email when done. */
  value: string | null
}

/** The server's three checklist items (FR-021); the fourth, language and theme, is the device's. */
export function finishItems(input: { phone: string | null; name: string | null; email: string | null }): FinishItem[] {
  const given = (v: string | null) => (v && v.trim() ? v : null)
  const values: Record<FinishItemKey, string | null> = { number: given(input.phone), name: given(input.name), email: given(input.email) }
  return FINISH_ITEMS.map((key) => ({ key, done: values[key] !== null, value: values[key] }))
}

/** 25 opens on its own once: after a first booking, until it has been shown (FR-020). */
export const finishAutoOpen = (input: { bookingCount: number; dismissedAt: string | null }): boolean => input.bookingCount > 0 && input.dismissedAt === null
