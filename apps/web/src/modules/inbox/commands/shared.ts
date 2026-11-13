import 'server-only'
import type { CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { dubaiToday, isBriefOpen } from '@shoot/domain/booking'
import { readQuickMatch } from '@/modules/booking'
import type { Payload } from 'payload'
import type { Brief, BriefAnswer, User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { problem, type Problem } from '@/shared/api/problem'
import { creatorInbox, liveProfiles } from '../queries'

/** What an inbox command needs: the same shape for the website's actions and the app's handlers. */
export interface InboxActor {
  payload: Payload
  user: User | null
  locale: Locale
  now: Date
}

export const notProvider = () => problem(403, 'creators.errors.notProvider')
export const briefClosed = () => problem(409, 'inbox.errors.briefClosed')

export async function briefByRef(payload: Payload, ref: string): Promise<Brief | null> {
  const { docs } = await payload.find({ collection: 'briefs', where: { reference: { equals: ref.toUpperCase() } }, limit: 1, depth: 0, overrideAccess: true })
  return (docs[0] as Brief | undefined) ?? null
}

/** The caller's live profile that offers this professional type (a creator usually has one profile). */
export async function profileFor(actor: InboxActor, personaId: string) {
  if (actor.user?.accountType !== 'provider') return null
  return (await liveProfiles(actor.user.id, actor.locale)).find((p) => p.personaIds.includes(personaId)) ?? null
}

export async function answerRow(payload: Payload, briefId: number, creatorId: string, personaId: string): Promise<BriefAnswer | null> {
  const { docs } = await payload.find({
    collection: 'brief-answers',
    where: { and: [{ brief: { equals: briefId } }, { creator: { equals: Number(creatorId) } }, { persona: { equals: Number(personaId) } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (docs[0] as BriefAnswer | undefined) ?? null
}

export async function inboxOf(actor: InboxActor): Promise<CreatorBriefsV1 | Problem> {
  if (actor.user?.accountType !== 'provider') return notProvider()
  return (await creatorInbox({ payload: actor.payload, locale: actor.locale, now: actor.now }, actor.user.id)) ?? { open: [], accepted: [], rejected: [], reasons: [] }
}

/** Whether the brief itself is still open, whoever looks at it (research R2). */
export async function stillOpen(actor: InboxActor, brief: Brief): Promise<boolean> {
  const [settings, bookings] = await Promise.all([
    readQuickMatch(actor.payload),
    actor.payload.find({ collection: 'bookings', where: { brief: { equals: brief.id } }, depth: 0, pagination: false, overrideAccess: true, select: { state: true } }),
  ])
  return isBriefOpen(
    { status: brief.status ?? 'new', date: brief.date ? String(brief.date).slice(0, 10) : null, createdAt: brief.createdAt, bookingStates: bookings.docs.map((b) => b.state) },
    { today: dubaiToday(actor.now), inboxDays: settings.inboxDays },
  )
}
