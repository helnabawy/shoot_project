import { z } from 'zod'
import { checkSlot, todayInZone, type SlotRule } from './validate'

export { CUSTOM_TEXT_MAX, todayInZone, type SlotKind, type SlotRule } from './validate'

/**
 * Zod schema for a brief built from the published slot definitions (FR-050). It applies the
 * same rules as `validateBrief`, for server code that prefers a schema. Messages are keys.
 */
export function briefSchema(slots: readonly SlotRule[], options: { today?: string } = {}) {
  const today = options.today ?? todayInZone()
  const shape: Record<string, z.ZodType<string>> = {}
  for (const slot of slots) {
    shape[slot.token] = z
      .string()
      .trim()
      .default('')
      .superRefine((value, ctx) => {
        const error = checkSlot(slot, value, today)
        if (error) ctx.addIssue({ code: 'custom', message: error })
      }) as unknown as z.ZodType<string>
  }
  return z.object(shape)
}
