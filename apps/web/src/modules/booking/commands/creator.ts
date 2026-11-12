import 'server-only'
import type {
  AvailabilityV1,
  BookingRequestV1,
  CreatorAccountV1,
  CreatorBookingsV1,
  MyProfileV1,
} from '@shoot/domain/api/v1'
import { addDays, allConfirmed, dubaiToday, respond, type Assignment } from '@shoot/domain/booking'
import type { Booking, User } from '@/payload-types'
import { getDirectoryContext, getLocations } from '@/modules/creators'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { blockDateFor, releaseDates } from '../effects'
import { myProfileIds } from '../queries'
import { toAssignments, toRows } from '../rows'
import { applyChange, applyTransition } from '../transitions'

/**
 * The creator's side of bookings and availability for the app (feature 014): the same rules and writes as
 * the website's `respondToAssignment`, `markDelivered` and `toggleBlockedDate`, returning the wire views.
 * A creator sees only their own assignments and the client's first name, never a phone number.
 */

export const AVAILABILITY_DAYS = 90

const notProvider = () => problem(403, 'creators.errors.notProvider')
const providerOf = (ctx: ActorContext): User | null => (ctx.user?.accountType === 'provider' ? ctx.user : null)

const UPCOMING: readonly string[] = ['confirmed', 'paid', 'scheduled', 'on-hold']
const DONE: readonly string[] = ['delivered', 'completed']

async function bookingsOf(ctx: ActorContext, user: User, profileIds: number[]): Promise<Booking[]> {
  if (!profileIds.length) return []
  const { docs } = await ctx.payload.find({
    collection: 'bookings',
    where: { and: [{ 'assignments.creator': { in: profileIds } }, { state: { not_in: ['quoted', 'expired'] } }] },
    sort: 'date',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })
  void user
  return docs
}

function answerOf(a: Assignment, respondBy: string | null, now: Date): BookingRequestV1['answer'] {
  if (a.status === 'confirmed') return 'confirmed'
  if (a.status === 'declined') return 'declined'
  if (a.status === 'lapsed') return 'lapsed'
  if (a.status === 'pending' && respondBy && new Date(respondBy).getTime() < now.getTime()) return 'lapsed'
  return 'pending'
}

async function requestsOf(ctx: ActorContext, user: User): Promise<{ requests: BookingRequestV1[]; blocks: number }> {
  const profileIds = await myProfileIds(user.id)
  const mine = profileIds.map(String)
  const [bookings, directory, locations] = await Promise.all([bookingsOf(ctx, user, profileIds), getDirectoryContext(ctx.locale), getLocations(ctx.locale)])
  const place = new Map(locations.map((l) => [l.slug, l.name]))
  const now = ctx.now()
  const requests: BookingRequestV1[] = []
  for (const b of bookings) {
    const brief = typeof b.brief === 'object' && b.brief ? b.brief : null
    const quotation = typeof b.quotation === 'object' && b.quotation ? ((b.quotation as { reference?: string | null }).reference ?? null) : null
    for (const a of toAssignments(b.assignments)) {
      if (!a.creatorId || !mine.includes(a.creatorId)) continue
      const answer = answerOf(a, a.respondBy ?? null, now)
      requests.push({
        ref: b.reference,
        quotation,
        occasion: brief?.sentence ?? '',
        emirate: b.location ? (place.get(b.location) ?? '') : '',
        date: b.date ?? '',
        profession: directory.lookups.personas.get(a.personaId) ?? '',
        client: (b.client?.name ?? '').trim().split(/\s+/)[0] ?? '',
        respondBy: a.respondBy ?? null,
        state: b.state,
        answer,
        canDeliver: b.state === 'scheduled' && Boolean(b.date) && (b.date as string) < dubaiToday(now),
        paid: ['paid', 'scheduled', 'delivered', 'completed'].includes(b.state),
      })
    }
  }
  return { requests, blocks: 0 }
}

/** Waiting (nearest deadline first), upcoming (by date), done (newest first) and the creator's own notices. */
export async function creatorBookings(ctx: ActorContext): Promise<CreatorBookingsV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  return bookingsView(ctx, user)
}

async function bookingsView(ctx: ActorContext, user: User): Promise<CreatorBookingsV1> {
  const { requests } = await requestsOf(ctx, user)
  const byDeadline = (a: BookingRequestV1, b: BookingRequestV1) => (a.respondBy ?? '9').localeCompare(b.respondBy ?? '9')
  const notices = await ctx.payload.find({
    collection: 'notifications',
    where: { and: [{ user: { equals: user.id } }, { audience: { equals: 'creator' } }, { channel: { equals: 'in-app' } }] },
    sort: '-createdAt',
    limit: 20,
    depth: 1,
    overrideAccess: true,
  })
  return {
    updates: notices.docs.map((n) => ({
      id: String(n.id),
      event: n.event,
      ref: typeof n.booking === 'object' && n.booking ? n.booking.reference : null,
      createdAt: n.createdAt,
      read: Boolean(n.readAt),
    })),
    waiting: requests.filter((r) => r.answer === 'pending' && r.state === 'accepted' && r.respondBy !== null).sort(byDeadline),
    upcoming: requests.filter((r) => r.answer === 'confirmed' && UPCOMING.includes(r.state)).sort((a, b) => a.date.localeCompare(b.date)),
    done: requests.filter((r) => r.answer === 'confirmed' && DONE.includes(r.state)).sort((a, b) => b.date.localeCompare(a.date)),
  }
}

async function loadMine(ctx: ActorContext, user: User, ref: string): Promise<{ booking: Booking; list: Assignment[]; mine: Assignment } | Problem> {
  const found = (await ctx.payload.find({ collection: 'bookings', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!found) return problem(404, 'booking.errors.not-found')
  const ids = (await myProfileIds(user.id)).map(String)
  const list = toAssignments(found.assignments)
  const mine = list.find((a) => a.creatorId && ids.includes(a.creatorId) && a.status === 'pending') ?? list.find((a) => a.creatorId && ids.includes(a.creatorId))
  if (!mine) return problem(403, 'booking.errors.notYours')
  return { booking: found as Booking, list, mine }
}

/** Confirm or decline (US2): refused after the deadline or when the booking is no longer waiting; the first confirmation of a date wins. */
export async function answerRequest(ctx: ActorContext, ref: string, input: { decision: 'confirm' | 'decline'; reason?: string }): Promise<CreatorBookingsV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const loaded = await loadMine(ctx, user, ref)
  if ('status' in loaded) return loaded
  const { booking, list, mine } = loaded
  const now = ctx.now()
  if (booking.state !== 'accepted') return problem(409, 'booking.errors.not-allowed')
  if (mine.respondBy && new Date(mine.respondBy).getTime() < now.getTime()) return problem(409, 'booking.errors.not-allowed')
  const answer = respond(list, mine.personaId, mine.creatorId as string, input.decision, now, input.reason)
  if (!answer.ok) return problem(409, 'booking.errors.not-allowed')
  const creatorId = Number(mine.creatorId)

  if (input.decision === 'confirm' && !(await blockDateFor(ctx.payload, booking, creatorId))) {
    const lapsed: Assignment[] = list.map((a) => (a.personaId === mine.personaId ? { ...a, status: 'lapsed', respondedAt: now.toISOString() } : a))
    await applyChange(ctx.payload, booking.id, () => ({ ok: true, data: { assignments: toRows(lapsed) }, event: 'date-taken' }), { actor: 'system', now, notifyAs: 'lapsed' })
    return problem(409, 'booking.errors.dateTaken')
  }
  const actor = { actor: 'creator' as const, actorUser: user.id, now, note: input.reason ?? null }
  const result = allConfirmed(answer.assignments)
    ? await applyTransition(ctx.payload, booking.id, 'confirm', { ...actor, data: { assignments: toRows(answer.assignments) } })
    : await applyChange(ctx.payload, booking.id, () => ({ ok: true, data: { assignments: toRows(answer.assignments) }, event: input.decision }), {
        ...actor,
        notifyAs: input.decision === 'decline' ? 'declined' : null,
      })
  if (!result.ok) {
    if (input.decision === 'confirm') await releaseDates(ctx.payload, booking.id, undefined, creatorId)
    return problem(result.reason === 'not-found' ? 404 : 409, result.reason === 'not-found' ? 'booking.errors.not-found' : 'booking.errors.not-allowed')
  }
  return bookingsView(ctx, user)
}

/** "Mark as delivered": only after the shoot day, and only on the creator's own booking. */
export async function markDelivered(ctx: ActorContext, ref: string): Promise<CreatorBookingsV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const loaded = await loadMine(ctx, user, ref)
  if ('status' in loaded) return loaded
  const now = ctx.now()
  if (!loaded.booking.date || loaded.booking.date >= dubaiToday(now)) return problem(409, 'booking.errors.not-allowed')
  const result = await applyTransition(ctx.payload, loaded.booking.id, 'deliver', { actor: 'creator', actorUser: user.id, now })
  if (!result.ok) return problem(409, 'booking.errors.not-allowed')
  return bookingsView(ctx, user)
}

/** Marks one of the creator's own notices as read. */
export async function markUpdateRead(ctx: ActorContext, id: string): Promise<CreatorBookingsV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const own = (await ctx.payload.find({ collection: 'notifications', where: { and: [{ id: { equals: Number(id) } }, { user: { equals: user.id } }] }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!own) return problem(404, 'booking.errors.not-found')
  await ctx.payload.update({ collection: 'notifications', id: own.id, data: { readAt: ctx.now().toISOString() }, user, overrideAccess: false })
  return bookingsView(ctx, user)
}

/** The 90-day window from today: only the blocked and booked days are listed. */
export async function creatorAvailability(ctx: ActorContext): Promise<AvailabilityV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  return availabilityView(ctx, user)
}

async function availabilityView(ctx: ActorContext, user: User): Promise<AvailabilityV1> {
  const today = dubaiToday(ctx.now())
  const last = addDays(today, AVAILABILITY_DAYS - 1)
  const [profileId] = await myProfileIds(user.id)
  const rows = profileId
    ? (await ctx.payload.find({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profileId } }, { date: { greater_than_equal: today } }, { date: { less_than_equal: last } }] }, depth: 0, pagination: false, sort: 'date', overrideAccess: true })).docs
    : []
  const days = rows.map((r) => ({ date: r.date, state: r.kind === 'blocked' ? ('blocked' as const) : ('booked' as const) }))
  return { today, windowDays: AVAILABILITY_DAYS, days, blockedCount: days.filter((d) => d.state === 'blocked').length }
}

/** Blocks or frees one day inside the window; booked and past days are refused by the collection's own rules. */
export async function setAvailability(ctx: ActorContext, date: string, blocked: boolean): Promise<AvailabilityV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const today = dubaiToday(ctx.now())
  const [profileId] = await myProfileIds(user.id)
  if (!profileId) return problem(403, 'availability.errors.notYours')
  if (date < today || date > addDays(today, AVAILABILITY_DAYS - 1)) return problem(409, 'availability.errors.generic')
  try {
    if (blocked) {
      const existing = await ctx.payload.find({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profileId } }, { date: { equals: date } }] }, limit: 1, depth: 0, overrideAccess: true })
      if (existing.docs[0]?.kind === 'booking') return problem(409, 'availability.errors.generic')
      if (!existing.docs[0]) await ctx.payload.create({ collection: 'availability-blocks', data: { creator: profileId, date, kind: 'blocked', user: user.id }, user, overrideAccess: false })
    } else {
      await ctx.payload.delete({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profileId } }, { date: { equals: date } }, { kind: { equals: 'blocked' } }] }, user, overrideAccess: false })
    }
  } catch (error) {
    const message = (error as Error).message
    return problem(message === 'availability.errors.notYours' ? 403 : 409, message === 'availability.errors.notYours' ? 'availability.errors.notYours' : 'availability.errors.generic')
  }
  return availabilityView(ctx, user)
}

/** My account (27): who, what is needed, the one urgent request and the counts. */
export async function creatorAccount(ctx: ActorContext, profile: MyProfileV1): Promise<CreatorAccountV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const [{ requests }, availability, directory] = await Promise.all([requestsOf(ctx, user), availabilityView(ctx, user), getDirectoryContext(ctx.locale)])
  const waiting = requests
    .filter((r) => r.answer === 'pending' && r.state === 'accepted' && r.respondBy !== null)
    .sort((a, b) => (a.respondBy ?? '').localeCompare(b.respondBy ?? ''))
  const professions = profile.fields.professions.map((id) => directory.lookups.personas.get(id)).filter((n): n is string => Boolean(n))
  return {
    name: profile.fields.displayName.en && ctx.locale === 'en' ? profile.fields.displayName.en : profile.fields.displayName.ar || profile.fields.displayName.en || (user.name ?? ''),
    code: profile.code || null,
    professions,
    status: profile.status,
    strength: profile.strength,
    needs: profile.steps.filter((s) => s.required.length || s.recommended.length).map((s) => ({ step: s.key, required: s.required, recommended: s.recommended })),
    waiting: waiting[0] ?? null,
    deliverable: requests.find((r) => r.canDeliver) ?? null,
    counts: {
      waiting: waiting.length,
      upcoming: requests.filter((r) => r.answer === 'confirmed' && UPCOMING.includes(r.state)).length,
      blockedDays: availability.blockedCount,
    },
  }
}

