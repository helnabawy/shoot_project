import type { Payload, PayloadRequest } from 'payload'
import type { Booking } from '@/payload-types'

const relId = (v: unknown): number | null => (v == null ? null : typeof v === 'object' ? Number((v as { id: unknown }).id) : Number(v))

export function assignedCreators(booking: Pick<Booking, 'assignments'>): number[] {
  return (booking.assignments ?? []).map((a) => relId(a.creator)).filter((id): id is number => id !== null)
}

/** Owner user of each creator profile (for availability rows and notifications). */
async function owners(payload: Payload, creatorIds: number[], req?: PayloadRequest): Promise<Map<number, number>> {
  if (!creatorIds.length) return new Map()
  const { docs } = await payload.find({ collection: 'creator-profiles', where: { id: { in: creatorIds } }, depth: 0, pagination: false, draft: true, overrideAccess: true, select: { user: true }, req })
  return new Map(docs.map((d) => [d.id, relId(d.user) ?? 0]))
}

/**
 * Books the date for a creator (research §6): the unique (creator, date) index makes the first confirmation win.
 * Returns false when the date is already taken by a block or another booking.
 */
export async function blockDateFor(payload: Payload, booking: Pick<Booking, 'id' | 'date'>, creatorId: number, req?: PayloadRequest): Promise<boolean> {
  if (!booking.date) return true
  const existing = await payload.find({ collection: 'availability-blocks', where: { and: [{ creator: { equals: creatorId } }, { date: { equals: booking.date } }] }, limit: 1, depth: 0, overrideAccess: true, req })
  const row = existing.docs[0]
  if (row) return relId(row.booking) === booking.id
  const user = (await owners(payload, [creatorId], req)).get(creatorId)
  if (!user) return false
  try {
    await payload.create({
      collection: 'availability-blocks',
      data: { creator: creatorId, user, date: booking.date, kind: 'booking', booking: booking.id },
      overrideAccess: true,
      context: { bookingTransition: true },
      req,
    })
    return true
  } catch (error) {
    if ((error as Error).name === 'ValidationError') return false
    throw error
  }
}

/** Frees every date this booking held (cancelled, expired, reassigned away). */
export async function releaseDates(payload: Payload, bookingId: number, req?: PayloadRequest, creatorId?: number) {
  await payload.delete({
    collection: 'availability-blocks',
    where: { and: [{ booking: { equals: bookingId } }, ...(creatorId ? [{ creator: { equals: creatorId } }] : [])] },
    overrideAccess: true,
    req,
  })
}
