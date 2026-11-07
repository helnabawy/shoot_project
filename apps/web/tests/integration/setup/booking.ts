import { addDays, dubaiToday } from '@shoot/domain/booking'
import type { Payload } from 'payload'
import { seedDemoPrices } from '@/shared/payload/seed/quick-match'
import type { Booking } from '@/payload-types'
import { createDraft, creatorWorld, listingOf, makeProvider, publish, type CreatorUser, type CreatorWorld } from './creators'
import { form, redirectOf } from './next-mocks'
import { quiet } from './payload'

export interface BookingWorld extends CreatorWorld {
  creators: Record<string, { id: number; code: string; user: CreatorUser }>
  /** A shoot day ten days from now (UAE). */
  date: string
}

/**
 * The default seed, the demo prices and four published creators:
 * sara (photographer, Dubai), omar (photographer, Dubai), vera (videographer, Dubai), abu (photographer, Abu Dhabi only).
 */
export async function bookingWorld(): Promise<BookingWorld> {
  const world = await creatorWorld()
  await seedDemoPrices(world.payload, () => {})
  // Tests send many briefs from few visitors; the brief limit has its own tests (feature 001).
  await world.payload.updateGlobal({ slug: 'site-settings', data: { briefLimitPerHour: 100 }, context: quiet })
  const creators: BookingWorld['creators'] = {}
  const make = async (key: string, name: string, persona: number, city: number) => {
    const user = await makeProvider(world, persona)
    const profile = await createDraft(world, user, { displayName: name, personas: [persona], cities: [city] })
    await publish(world, profile.id)
    creators[key] = { id: profile.id, code: profile.code as string, user }
  }
  await make('sara', 'Sara Khan', world.personas.photographer, world.dubai)
  await make('omar', 'Omar Ali', world.personas.photographer, world.dubai)
  await make('vera', 'Vera Video', world.personas.videographer, world.dubai)
  await make('abu', 'Abu Dhabi Pro', world.personas.photographer, world.abuDhabi)
  return { ...world, creators, date: addDays(dubaiToday(new Date()), 10) }
}

export async function setMatchValues(world: BookingWorld, key: string, values: string[]) {
  const listing = await listingOf(world, world.creators[key]!.id)
  await world.payload.update({ collection: 'creator-listings', id: listing!.id, data: { matchValues: values }, overrideAccess: true, context: quiet })
}

type Submit = (prev: never, data: FormData) => Promise<{ status: string; matchUrl?: string; reference?: string }>

/** Submits a brief through the real action and returns step 2's ref and key. */
export async function briefFor(submitBrief: Submit, world: BookingWorld, over: Record<string, string | string[]> = {}) {
  const state = await submitBrief({ status: 'idle' } as never, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: world.date, duration: '2h', location: 'dubai', shotBy: 'anyone', ...over }))
  if (!state.matchUrl) throw new Error(`no match url: ${JSON.stringify(state)}`)
  const [, , ref, key] = state.matchUrl.replace(/^\/ar/, '').split('/')
  return { ref: ref!, key: key!, url: state.matchUrl }
}

type RequestQuotation = (prev: never, data: FormData) => Promise<unknown>

/** Step 3 through the real action; returns the quotation page path parts. */
export async function quoteFor(requestQuotation: RequestQuotation, brief: { ref: string; key: string }, over: Record<string, string | string[] | undefined> = {}) {
  const url = await redirectOf(() => requestQuotation({ status: 'idle' } as never, form({ locale: 'en', ref: brief.ref, key: brief.key, pick: 'photographer:any', name: 'Layla Hassan', whatsapp: '+971501234567', ...over })))
  const [path, query] = url.split('?')
  const [, , ref, key] = path!.replace(/^\/ar/, '').split('/')
  return { ref: ref!, key: key!, url, query: query ?? '' }
}

export async function bookingByRef(payload: Payload, ref: string): Promise<Booking> {
  const { docs } = await payload.find({ collection: 'bookings', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })
  return docs[0] as Booking
}

export async function eventsOf(payload: Payload, bookingId: number) {
  return (await payload.find({ collection: 'booking-events', where: { booking: { equals: bookingId } }, sort: 'at', depth: 0, pagination: false, overrideAccess: true })).docs
}

export async function notificationsOf(payload: Payload, bookingId: number) {
  return (await payload.find({ collection: 'notifications', where: { booking: { equals: bookingId } }, depth: 0, pagination: false, overrideAccess: true })).docs
}
