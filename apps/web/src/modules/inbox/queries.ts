import 'server-only'
import type { BriefItemV1, BriefsSummaryV1, CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { addDays, briefMatchesCreator, dubaiToday, inboxSections, isBriefOpen, type InboxAnswer, type InboxBrief, type InboxEntry } from '@shoot/domain/booking'
import type { CreatorSummary } from '@shoot/domain/creators'
import type { Payload, Where } from 'payload'
import { briefFacts, DURATION_SET, LOCATION_SET, myProfileIds, readQuickMatch, unavailableOn } from '@/modules/booking'
import { getDirectoryContext, getLocations, getPublicCreators } from '@/modules/creators'
import { getLandingPage } from '@/modules/landing/queries'
import type { Brief, BriefAnswer, OptionSet } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'

/**
 * The creator brief inbox (feature 019, research R1/R2): open client briefs that match a live creator by
 * Quick Match step 2's rules, the creator's own answers, and the summary Up next leads with. Nothing here
 * ever reads or returns the client's name, number, email or account (FR-004).
 */

/** Open briefs read before matching (newest first): enough for a busy week, bounded for SC-001. */
export const OPEN_BRIEF_LIMIT = 200
/** Answered briefs stay in the creator's "said yes" and "not for me" lists this long. */
export const ANSWERED_DAYS = 30
export const REJECT_REASONS_SET = 'brief-reject-reasons'

const idOf = (v: unknown) => String(v && typeof v === 'object' ? (v as { id: unknown }).id : v)
const PAST_QUOTED = { state: { not_in: ['quoted', 'expired'] } }

type Slot = NonNullable<NonNullable<Awaited<ReturnType<typeof getLandingPage>>['briefBuilder']>['slots']>[number]

export interface InboxContext {
  payload: Payload
  locale: Locale
  now: Date
}

interface Item extends InboxEntry {
  view: BriefItemV1
}

/** The creator's live, listed profiles (an unlisted or hidden profile sees no briefs, US1-S4). */
export async function liveProfiles(userId: number, locale: Locale): Promise<CreatorSummary[]> {
  const [ids, creators] = await Promise.all([myProfileIds(userId), getPublicCreators(locale, { listedOnly: true })])
  const mine = new Set(ids.map(String))
  return creators.filter((c) => mine.has(c.id))
}

/** The occasion: the first option slot that is neither the duration, the place nor a creator filter. */
function occasionOf(brief: Brief, slots: readonly Slot[]): string {
  for (const slot of slots) {
    const set = slot.optionSet && typeof slot.optionSet === 'object' ? (slot.optionSet as OptionSet) : null
    if (!set || set.slug === DURATION_SET || set.slug === LOCATION_SET || slot.filtersCreators) continue
    const selection = (brief.selections ?? []).find((s) => s.token === slot.token)
    if (!selection?.value) continue
    if (selection.custom) return selection.value
    return (set.options ?? []).find((o) => o.value === selection.value)?.label ?? selection.label ?? selection.value
  }
  return ''
}

/** The rejection reasons, from the content area, in order (FR-008). */
export async function rejectReasons(payload: Payload, locale: Locale): Promise<{ value: string; label: string }[]> {
  const set = (await payload.find({ collection: 'option-sets', where: { slug: { equals: REJECT_REASONS_SET } }, limit: 1, depth: 0, locale, overrideAccess: true })).docs[0]
  return [...(set?.options ?? [])]
    .filter((o) => o.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((o) => ({ value: o.value, label: o.label }))
}

/** Everything the inbox needs for one creator, in a handful of queries (SC-001). */
async function readInbox(ctx: InboxContext, userId: number) {
  const { payload, locale, now } = ctx
  const today = dubaiToday(now)
  const profiles = await liveProfiles(userId, locale)
  if (!profiles.length) return null
  const profileIds = profiles.map((p) => p.id)
  const [settings, landing, directory, locations, reasons, answersFound] = await Promise.all([
    readQuickMatch(payload),
    getLandingPage({ locale }),
    getDirectoryContext(locale),
    getLocations(locale),
    rejectReasons(payload, locale),
    payload.find({
      collection: 'brief-answers',
      where: { and: [{ creator: { in: profileIds } }, { answeredAt: { greater_than_equal: new Date(now.getTime() - ANSWERED_DAYS * 86_400_000).toISOString() } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const answers = answersFound.docs as BriefAnswer[]
  const oldestUndated = new Date(Date.parse(`${addDays(today, -settings.inboxDays)}T00:00:00+04:00`)).toISOString()
  const openWhere: Where = {
    and: [
      { status: { equals: 'new' } },
      { or: [{ date: { greater_than_equal: `${today}T00:00:00.000Z` } }, { and: [{ date: { exists: false } }, { createdAt: { greater_than_equal: oldestUndated } }] }] },
    ],
  }
  const answeredIds = [...new Set(answers.map((a) => idOf(a.brief)))]
  const [open, answered] = await Promise.all([
    payload.find({ collection: 'briefs', where: openWhere, sort: '-createdAt', limit: OPEN_BRIEF_LIMIT, depth: 0, overrideAccess: true }),
    answeredIds.length ? payload.find({ collection: 'briefs', where: { id: { in: answeredIds } }, depth: 0, pagination: false, overrideAccess: true }) : Promise.resolve({ docs: [] as Brief[] }),
  ])
  const briefs = new Map<string, Brief>()
  for (const b of [...open.docs, ...answered.docs] as Brief[]) briefs.set(String(b.id), b)
  const ids = [...briefs.keys()].map(Number)
  const bookings = ids.length
    ? (await payload.find({ collection: 'bookings', where: { brief: { in: ids } }, depth: 0, pagination: false, overrideAccess: true, select: { brief: true, state: true, assignments: true } })).docs
    : []
  const slots = landing.briefBuilder?.slots ?? []
  const dates = [...new Set([...briefs.values()].map((b) => (b.date ? String(b.date).slice(0, 10) : null)).filter((d): d is string => Boolean(d)))]
  const blocks = await unavailableOn(dates)
  return { today, settings, profiles, profileIds, directory, locations, reasons, answers, briefs, bookings, slots, blocks }
}

type Read = NonNullable<Awaited<ReturnType<typeof readInbox>>>

/** The creator's items: open matching briefs and their own answers, one per brief and type. */
function itemsOf(read: Read): Item[] {
  const { today, settings, profiles, profileIds, directory, locations, answers, briefs, bookings, slots, blocks } = read
  const items: Item[] = []
  for (const brief of briefs.values()) {
    const facts = briefFacts(brief, slots)
    const emirate = facts.location && !facts.location.custom ? (locations.find((l) => l.slug === facts.location?.value && !l.parentId) ?? null) : null
    const mine = bookings.filter((b) => idOf(b.brief) === String(brief.id))
    const inbox: InboxBrief = {
      id: String(brief.id),
      status: brief.status ?? 'new',
      personaIds: facts.personaIds,
      emirateId: emirate?.id ?? null,
      date: facts.date,
      createdAt: brief.createdAt,
      namedCreatorId: brief.creator ? idOf(brief.creator) : null,
      filters: facts.filters,
      categoryId: facts.categoryId,
      bookingStates: mine.map((b) => b.state),
    }
    const open = isBriefOpen(inbox, { today, inboxDays: settings.inboxDays })
    const booked = mine.find((b) => b.state !== 'quoted' && b.state !== 'expired')
    const bookedMe = Boolean(booked?.assignments?.some((a) => a.creator != null && profileIds.includes(idOf(a.creator))))
    const outcome: BriefItemV1['outcome'] = open ? 'open' : booked ? (bookedMe ? 'booked-you' : 'other-creator') : 'closed'
    for (const profile of profiles) {
      const busy = facts.date && blocks.get(facts.date)?.has(profile.id) ? new Set([facts.date]) : new Set<string>()
      const matched = open ? briefMatchesCreator(profile, inbox, busy) : []
      const answeredFor = answers.filter((a) => idOf(a.brief) === String(brief.id) && idOf(a.creator) === profile.id)
      const personas = new Set([...matched, ...answeredFor.filter((a) => !a.withdrawnAt).map((a) => idOf(a.persona))])
      for (const personaId of personas) {
        const row = answeredFor.find((a) => idOf(a.persona) === personaId)
        const answer: InboxAnswer | null = row ? { decision: row.decision, answeredAt: row.answeredAt, withdrawnAt: row.withdrawnAt ?? null } : null
        // A withdrawn answer on a brief that no longer matches or is closed shows nowhere.
        if (!matched.includes(personaId) && (!answer || answer.withdrawnAt)) continue
        const current = answer && !answer.withdrawnAt ? answer : null
        items.push({
          ref: brief.reference ?? '',
          date: facts.date,
          createdAt: brief.createdAt,
          specialtyMatch: Boolean(facts.categoryId && profile.specialtyIds.includes(facts.categoryId)),
          answer,
          view: {
            ref: brief.reference ?? '',
            persona: personaId,
            profession: directory.lookups.personas.get(personaId) ?? '',
            occasion: occasionOf(brief, slots),
            sentence: brief.sentence ?? '',
            emirate: emirate?.name ?? (facts.location?.custom ? facts.location.value : ''),
            date: facts.date,
            sentAt: brief.createdAt,
            answer: current?.decision ?? null,
            reason: current?.decision === 'rejected' ? (row?.reason ?? null) : null,
            outcome,
          },
        })
      }
    }
  }
  return items
}

/** The creator's inbox, or `null` when they have no live profile (US1-S4). */
export async function creatorInbox(ctx: InboxContext, userId: number): Promise<CreatorBriefsV1 | null> {
  const read = await readInbox(ctx, userId)
  if (!read) return null
  const { open, accepted, rejected } = inboxSections(itemsOf(read))
  return { open: open.map((i) => i.view), accepted: accepted.map((i) => i.view), rejected: rejected.map((i) => i.view), reasons: read.reasons }
}

/** What Up next leads with: how many open briefs wait and the soonest one (FR-005). `null` when not live. */
export async function briefsSummary(ctx: InboxContext, userId: number): Promise<BriefsSummaryV1 | null> {
  const inbox = await creatorInbox(ctx, userId)
  if (!inbox) return null
  const first = inbox.open[0]
  return {
    count: inbox.open.length,
    soonest: first ? { ref: first.ref, profession: first.profession, occasion: first.occasion, emirate: first.emirate, date: first.date } : null,
  }
}

/** Convenience for pages: the shared Payload client. */
export async function inboxContext(locale: Locale, now = new Date()): Promise<InboxContext> {
  return { payload: await getPayloadClient(), locale, now }
}
