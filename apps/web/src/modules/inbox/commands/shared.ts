import 'server-only'
import type { CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { dubaiToday, isBriefOpen, offerRange, type OfferState } from '@shoot/domain/booking'
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

/** 022: a brief's offer terms as the commands need them (frozen at sending, research R1). */
export function offerTermsOf(brief: Brief) {
  const offers = (brief as { offers?: { mode?: string | null; feePercent?: number | null; minPercent?: number | null; maxPercent?: number | null } | null }).offers
  const budgets = ((brief as { budgets?: { persona: unknown; suggestedFils?: number | null; amountFils: number }[] | null }).budgets ?? []).map((b) => ({
    personaId: String(b.persona && typeof b.persona === 'object' ? (b.persona as { id: unknown }).id : b.persona),
    suggestedFils: b.suggestedFils ?? null,
    amountFils: b.amountFils,
  }))
  if (offers?.mode !== 'offers') return null
  const settings = { minPercent: offers.minPercent ?? 70, maxPercent: offers.maxPercent ?? 200 }
  return {
    feePercent: offers.feePercent ?? 10,
    budgetFor: (personaId: string) => budgets.find((b) => b.personaId === personaId) ?? null,
    rangeFor: (personaId: string) => offerRange(budgets.find((b) => b.personaId === personaId)?.suggestedFils ?? null, settings),
  }
}

/**
 * 022 (FR-010): an offer is locked while the brief's latest booking names this creator for this type and has
 * not expired or been cancelled (a quotation including the offer is issued, or the booking went ahead).
 */
export async function offerLocked(payload: Payload, briefId: number, creatorId: string, personaId: string): Promise<boolean> {
  const { docs } = await payload.find({ collection: 'bookings', where: { brief: { equals: briefId } }, sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true, select: { state: true, assignments: true } })
  const latest = docs[0] as { state?: string; assignments?: { persona?: unknown; creator?: unknown }[] | null } | undefined
  if (!latest || latest.state === 'expired' || latest.state === 'cancelled') return false
  const id = (v: unknown) => String(v && typeof v === 'object' ? (v as { id: unknown }).id : v)
  return (latest.assignments ?? []).some((a) => id(a.creator) === String(creatorId) && id(a.persona) === String(personaId))
}

/** 022: the rules' view of a creator's current answer. */
export function offerStateOf(row: BriefAnswer | null, locked: boolean): OfferState | null {
  if (!row) return null
  const r = row as BriefAnswer & { revisions?: number | null; clientDecision?: string | null }
  return { decision: r.decision, withdrawn: Boolean(r.withdrawnAt), declined: r.clientDecision === 'declined', revisions: r.revisions ?? 0, locked }
}
