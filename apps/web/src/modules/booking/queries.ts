import 'server-only'
import { normaliseQuoteReference } from '@shoot/domain/booking'
import type { Booking, Quotation, User } from '@/payload-types'
import { getPayloadClient } from '@/shared/lib/payload'
import { keyMatches } from './keys'
import { idOf } from './rows'

export type BookingRecord = Booking & { accessSalt?: string | null }

export interface QuotationAccess {
  quotation: Quotation
  booking: BookingRecord
  /** The booking's current version (differs when this one was replaced). */
  current: Quotation
}

/** A quotation behind its private link or for its signed-in owner; null otherwise (same 404, FR-011). */
export async function getQuotationAccess(ref: string, key: string | null, memberId?: number | null, locale: 'en' | 'ar' = 'en'): Promise<QuotationAccess | null> {
  const reference = normaliseQuoteReference(ref)
  if (!reference) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'quotations', where: { reference: { equals: reference } }, limit: 1, depth: 0, overrideAccess: true })
  const quotation = docs[0]
  if (!quotation) return null
  const booking = (await payload.findByID({ collection: 'bookings', id: Number(idOf(quotation.booking)), depth: 2, locale, fallbackLocale: 'en', overrideAccess: true, showHiddenFields: true })) as BookingRecord
  const member = booking.member ? Number(idOf(booking.member)) : null
  const allowed = keyMatches(key, booking.accessSalt, 'booking') || (memberId != null && member === memberId)
  if (!allowed) return null
  const current = typeof booking.quotation === 'object' && booking.quotation ? booking.quotation : quotation
  return { quotation, booking, current }
}

/** A signed-in client's bookings, newest first (QM-US2-S6). */
export async function getMyBookings(user: User): Promise<Booking[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'bookings', where: { member: { equals: user.id } }, sort: '-createdAt', limit: 50, depth: 1, overrideAccess: false, user })
  return docs
}

/** The creator profiles a user owns (any state), for provider pages and ownership checks. */
export async function myProfileIds(userId: number): Promise<number[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'creator-profiles', where: { user: { equals: userId } }, draft: true, depth: 0, limit: 5, overrideAccess: true, select: { user: true } })
  return docs.map((d) => d.id)
}

/** Bookings with an assignment for the user's profile, once the client has accepted (US3). */
export async function getCreatorBookings(user: User): Promise<Booking[]> {
  const ids = await myProfileIds(user.id)
  if (!ids.length) return []
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { and: [{ 'assignments.creator': { in: ids } }, { state: { not_in: ['quoted', 'expired'] } }] },
    sort: 'date',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })
  return docs
}

export async function getMyNotifications(user: User) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'notifications', where: { readAt: { exists: false } }, sort: '-createdAt', limit: 20, depth: 0, overrideAccess: false, user })
  return docs
}

/** The provider's profile and unavailable dates from `from` on. */
export async function getMyAvailability(user: User, from: string) {
  const [profileId] = await myProfileIds(user.id)
  if (!profileId) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profileId } }, { date: { greater_than_equal: from } }] }, depth: 0, pagination: false, overrideAccess: false, user })
  return { profileId, blocks: docs.map((b) => ({ id: b.id, date: b.date, kind: b.kind })) }
}
