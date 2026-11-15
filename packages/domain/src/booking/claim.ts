/**
 * Feature 021, amendment 2026-11-15: accepting a quotation needs a signed-in member, and a guest's
 * quotation becomes the account of whoever accepts it through the private link. A booking that already
 * belongs to another member is never taken over. Ids may arrive as numbers or strings.
 */

type Id = number | string | null | undefined

export type ClaimDecision =
  | { ok: false; reason: 'signInRequired' | 'otherAccount' }
  | { ok: true; claimBooking: boolean; claimBrief: boolean }

const has = (id: Id): id is number | string => id !== null && id !== undefined && id !== ''

export function claimFor({ bookingMember, briefMember, userId }: { bookingMember: Id; briefMember: Id; userId: Id }): ClaimDecision {
  if (!has(userId)) return { ok: false, reason: 'signInRequired' }
  if (has(bookingMember) && String(bookingMember) !== String(userId)) return { ok: false, reason: 'otherAccount' }
  return { ok: true, claimBooking: !has(bookingMember), claimBrief: !has(briefMember) }
}
