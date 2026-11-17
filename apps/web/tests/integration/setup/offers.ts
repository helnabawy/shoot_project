import type { Payload } from 'payload'
import type { Brief } from '@/payload-types'
import { bookingWorld, type BookingWorld } from './booking'
import { getTestPayload, quiet } from './payload'

/** Feature 022 test world: the booking world with "Creators offer prices" on (fee 10 %, range 70–200 %). */
export async function offersWorld(over: { feePercent?: number; minPercent?: number; maxPercent?: number } = {}): Promise<BookingWorld> {
  const world = await bookingWorld()
  await setOffers(world.payload, { enabled: true, ...over })
  return world
}

export async function setOffers(payload: Payload, offers: { enabled: boolean; feePercent?: number; minPercent?: number; maxPercent?: number }) {
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as { quickMatch?: Record<string, unknown> | null }
  await payload.updateGlobal({
    slug: 'site-settings',
    data: { quickMatch: { ...(settings.quickMatch ?? {}), enabled: true, offers: { feePercent: 10, minPercent: 70, maxPercent: 200, ...offers } } } as never,
    overrideAccess: true,
    context: quiet,
  })
}

export async function briefByRef(ref: string): Promise<Brief & Record<string, unknown>> {
  const payload = await getTestPayload()
  const { docs } = await payload.find({ collection: 'briefs', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })
  return docs[0] as Brief & Record<string, unknown>
}

/** The answer row of one creator on one brief. */
export async function answerOf(ref: string, creatorId: number) {
  const payload = await getTestPayload()
  const brief = await briefByRef(ref)
  const { docs } = await payload.find({ collection: 'brief-answers', where: { and: [{ brief: { equals: brief.id } }, { creator: { equals: creatorId } }] }, limit: 1, depth: 0, overrideAccess: true })
  return docs[0] as unknown as (Record<string, unknown> & { id: number }) | undefined
}
