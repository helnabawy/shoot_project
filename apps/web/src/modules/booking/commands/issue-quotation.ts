import 'server-only'
import { dubaiToday, initialAssignments, offerQuote, type Pick } from '@shoot/domain/booking'
import { quotePrice } from '@shoot/domain/pricing'
import { getTranslations } from 'next-intl/server'
import type { Payload, PayloadRequest } from 'payload'
import { findPromo, getPriceRules } from '@/modules/pricing'
import type { Booking } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { errorStatus } from '@/shared/payload/errors'
import { consumeAllowance } from '@/shared/payload/rate-limit'
import { accessKey, newSalt } from '../keys'
import { getMatchPage, lineLabels, type BriefRecord } from '../match'
import { notify } from '../notify'
import { createQuotation, uniqueReference, validUntilFrom } from '../quote'
import { idOf, toRows } from '../rows'
import { readQuickMatch } from '../settings'
import { TRANSITION_CONTEXT, recordEvent } from '../transitions'

/**
 * Step 3 → a quotation and a booking in "quoted" (US2-S1, FR-001, FR-004, FR-010), shared by the
 * website's `requestQuotation` action and the mobile API's `quotationIssue`. The caller has checked the
 * brief's private key and parsed the client's details; `limitKey` is what the hourly limit counts by.
 */

export interface IssueInput {
  brief: BriefRecord
  picks: Pick[]
  locale: Locale
  now: Date
  /** The signed-in member, if any. */
  userId: number | null
  client: { name: string; whatsapp: string }
  /** A date from step 2 or 3; falls back to the brief's. */
  date?: string
  addOnIds?: string[]
  promo?: string
  /** The app's details (012). */
  details?: { startTime: string; duration: string; venue: string; note?: string }
  /** The request the limit is counted on (cookie visitor for the website, install for the app). */
  req: PayloadRequest
  limitKey: string
  /** 022: the offer amounts the client saw, per persona slug; a moved one refuses (edge case). */
  expect?: { persona: string; amountFils: number }[]
}

export type IssueResult =
  | { ok: true; reference: string; key: string; promoNote: string }
  | { ok: false; formError: string; errors?: Record<string, string> }

const fail = (formError: string, errors?: Record<string, string>): IssueResult => ({ ok: false, formError, errors })

export async function issueQuotation(payload: Payload, input: IssueInput): Promise<IssueResult> {
  const { brief, picks, locale, now } = input
  const settings = await readQuickMatch(payload)
  try {
    await consumeAllowance(input.req, input.limitKey, settings.quoteLimitPerHour, 'booking.errors.tooMany')
  } catch (error) {
    if (errorStatus(error) === 429) return fail('booking.errors.tooMany')
    throw error
  }

  const briefDate = brief.date ? String(brief.date).slice(0, 10) : null
  // A nearby date chosen in step 2 (US1-S2) or the date asked in step 3 (US1-S3) wins over the brief's.
  const date = input.date ?? briefDate ?? null
  if (!date || date < dubaiToday(now)) return fail('', { date: 'booking.errors.date' })

  const offerMode = (brief as { offers?: { mode?: string | null } | null }).offers?.mode === 'offers'
  // 022 (FR-018a): an offers brief keeps the date and duration the creators priced.
  if (offerMode && briefDate && date !== briefDate) return fail('', { date: 'booking.errors.date' })
  const page = await getMatchPage(brief, locale, now, offerMode ? {} : { date, duration: input.details?.duration ?? null })
  if (offerMode) return issueFromOffers(payload, input, page, date, settings)
  const assigned: { personaId: string; creatorId: string | null }[] = []
  for (const section of page.sections) {
    const pick = picks.find((p) => p.persona === section.persona.slug)
    if (!pick) return fail('booking.errors.unavailable')
    const creator = pick.code ? section.creators.find((c) => c.code === pick.code) : null
    if (pick.code && !creator) return fail('booking.errors.unavailable')
    assigned.push({ personaId: section.persona.id, creatorId: creator?.id ?? null })
  }
  if (!assigned.length) return fail('booking.errors.generic')

  const promo = input.promo ? await findPromo(input.promo) : null
  const [rules, labels] = await Promise.all([getPriceRules(), lineLabels(promo?.code)])
  const quote = quotePrice(rules, {
    personaIds: assigned.map((a) => a.personaId),
    duration: page.facts.duration?.value ?? '',
    location: page.facts.location?.value ?? '',
    custom: { duration: page.facts.duration?.custom, location: page.facts.location?.custom },
    addOnIds: input.addOnIds ?? [],
    promo,
    labels,
    now,
  })
  if (!quote.ok) return fail('booking.errors.generic')

  return saveQuotation(payload, input, page, date, settings, assigned, { lines: quote.lines, subtotal: quote.subtotal, discount: quote.discount, total: quote.total, promoCode: quote.promo?.applied ? quote.promo.code : null }, quote.promo && !quote.promo.applied ? `?promo=${quote.promo.reason}` : quote.promo?.applied ? '?promo=applied' : '')
}

type Page = Awaited<ReturnType<typeof getMatchPage>>
type Settings = Awaited<ReturnType<typeof readQuickMatch>>
type Frozen = Parameters<typeof createQuotation>[1]['quote']

/**
 * 022 (US5, FR-017, FR-018): the quotation of an offers brief is the chosen offers plus the service fee. Every
 * type needs one chosen offer (no "let us choose"); add-ons and promo codes play no part. An offer that moved
 * since the client saw it refuses, so the client accepts only the amount shown.
 */
async function issueFromOffers(payload: Payload, input: IssueInput, page: Page, date: string, settings: Settings): Promise<IssueResult> {
  const brief = input.brief as typeof input.brief & { offers?: { feePercent?: number | null } | null }
  const assigned: { personaId: string; creatorId: string | null }[] = []
  const picks: { personaId: string; label: { en: string; ar: string }; amount: number }[] = []
  for (const section of page.sections) {
    const pick = input.picks.find((p) => p.persona === section.persona.slug)
    const offer = pick?.code ? section.offers?.find((o) => o.creator.code === pick.code) : undefined
    if (!offer) return fail('booking.errors.unavailable')
    const seen = input.expect?.find((e) => e.persona === section.persona.slug)
    if (seen && seen.amountFils !== offer.amountFils) return fail('offers.errors.amountChanged')
    assigned.push({ personaId: section.persona.id, creatorId: offer.creator.id })
    const label = `${section.persona.singular} · ${offer.creator.displayName}`
    picks.push({ personaId: section.persona.id, label: { en: label, ar: label }, amount: offer.amountFils })
  }
  if (!assigned.length) return fail('booking.errors.generic')
  const feePercent = brief.offers?.feePercent ?? 10
  const [en, ar] = await Promise.all([getTranslations({ locale: 'en', namespace: 'quote' }), getTranslations({ locale: 'ar', namespace: 'quote' })])
  const quote = offerQuote(picks, feePercent, { en: en('feeLine', { percent: feePercent }), ar: ar('feeLine', { percent: feePercent }) })
  return saveQuotation(payload, input, page, date, settings, assigned, { ...quote, promoCode: null }, '')
}

/** Books the quotation: a booking in "quoted" with its first quotation version (shared by both modes). */
async function saveQuotation(
  payload: Payload,
  input: IssueInput,
  page: Page,
  date: string,
  settings: Settings,
  assigned: { personaId: string; creatorId: string | null }[],
  quote: Frozen,
  promoNote: string,
): Promise<IssueResult> {
  const { brief, now, locale } = input
  const salt = newSalt()
  const reference = await uniqueReference(payload)
  const validUntil = validUntilFrom(now, settings.quotationValidDays)
  const user = input.userId
  let createdId: number | null = null
  try {
    const created = await payload.create({
      collection: 'bookings',
      data: {
        reference,
        state: 'quoted',
        revision: 0,
        brief: brief.id,
        member: user ?? (brief.member ? Number(idOf(brief.member)) : null),
        accessSalt: salt,
        client: { name: input.client.name, whatsapp: input.client.whatsapp, locale },
        details: input.details ? { startTime: input.details.startTime, duration: input.details.duration, venue: input.details.venue, note: input.details.note ?? null } : undefined,
        date,
        location: page.facts.location?.value ?? null,
        personas: assigned.map((a) => Number(a.personaId)),
        assignments: toRows(initialAssignments(assigned)),
        totalFils: quote.total,
        quoteValidUntil: validUntil,
      } as never,
      overrideAccess: true,
      context: TRANSITION_CONTEXT,
    })
    createdId = created.id
    const quotation = await createQuotation(payload, {
      bookingId: created.id,
      briefId: brief.id,
      quote,
      version: 1,
      validUntil,
      now,
      reference,
    })
    const booking = (await payload.update({
      collection: 'bookings',
      id: created.id,
      data: { quotation: quotation.id } as never,
      depth: 1,
      overrideAccess: true,
      showHiddenFields: true,
      context: TRANSITION_CONTEXT,
    })) as Booking
    await recordEvent(payload, { booking: booking.id, event: 'quote', from: null, to: 'quoted', actorRole: 'client', actor: user, at: now })
    await notify(payload, booking, 'quoted')
  } catch (error) {
    // Nothing half-saved: a booking whose quotation could not be written goes away (research R3).
    if (createdId !== null) await payload.delete({ collection: 'bookings', id: createdId, overrideAccess: true, context: TRANSITION_CONTEXT }).catch(() => null)
    throw error
  }

  return { ok: true, reference, key: accessKey(salt, 'booking'), promoNote }
}
