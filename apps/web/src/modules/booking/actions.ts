'use server'

import {
  allConfirmed,
  detailsSchema,
  dubaiToday,
  formatPicks,
  initialAssignments,
  parsePicks,
  reassign,
  reportSchema,
  respond,
  respondSchema,
  startAssignments,
  type Assignment,
} from '@shoot/domain/booking'
import { quotePrice } from '@shoot/domain/pricing'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createLocalReq } from 'payload'
import { getCurrentUser } from '@/modules/auth/session'
import { findPromo, getPriceRules } from '@/modules/pricing'
import type { Booking } from '@/payload-types'
import { localizeHref } from '@/shared/i18n/href'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { errorStatus } from '@/shared/payload/errors'
import { consumeAllowance, visitorKey } from '@/shared/payload/rate-limit'
import { blockDateFor, releaseDates } from './effects'
import { accessKey, newSalt } from './keys'
import { getBriefByKey, getMatchPage, lineLabels } from './match'
import { notify } from './notify'
import { detailsPath, quotePath } from './paths'
import { getQuotationAccess, myProfileIds } from './queries'
import { createQuotation, uniqueReference, validUntilFrom } from './quote'
import { idOf, toAssignments, toRows } from './rows'
import { payoutDue, readQuickMatch } from './settings'
import { applyChange, applyTransition, recordEvent, TRANSITION_CONTEXT, type ApplyResult } from './transitions'

export type QuoteState = { status: 'idle' } | { status: 'error'; errors: Record<string, string>; formError?: string }


const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const localeOf = (form: FormData): Locale => {
  const value = str(form, 'locale')
  return isLocale(value) ? value : 'en'
}
const fail = (formError: string, errors: Record<string, string> = {}): QuoteState => ({ status: 'error', errors, formError })

/** Back to a page with a message key, so every form works without JavaScript. */
function back(path: string, error?: string): never {
  redirect(error ? `${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(error)}` : path)
}

async function visitorReq() {
  const payload = await getPayloadClient()
  const visitorId = (await cookies()).get('sp_vid')?.value
  return createLocalReq({ context: visitorId ? { visitorId } : {} }, payload)
}

/** Step 3 → a quotation and a booking in "quoted" (US2-S1, FR-001, FR-004, FR-010). */
export async function requestQuotation(_prev: QuoteState, form: FormData): Promise<QuoteState> {
  const locale = localeOf(form)
  const now = new Date()
  const user = await getCurrentUser()
  const brief = await getBriefByKey(str(form, 'ref'), str(form, 'key'), user?.id)
  if (!brief) return fail('booking.errors.not-found')
  const picks = parsePicks(str(form, 'pick'))
  if (!picks) return fail('booking.errors.unavailable')

  const parsed = detailsSchema.safeParse({
    name: str(form, 'name'),
    whatsapp: str(form, 'whatsapp'),
    date: str(form, 'date') || undefined,
    addOnIds: form.getAll('addOn').map(String),
    promo: str(form, 'promo') || undefined,
  })
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? 'form')] ??= issue.message
    return { status: 'error', errors }
  }
  const details = parsed.data
  const payload = await getPayloadClient()
  const settings = await readQuickMatch(payload)

  try {
    const req = await visitorReq()
    await consumeAllowance(req, `quote:${visitorKey(req)}`, settings.quoteLimitPerHour, 'booking.errors.tooMany')
  } catch (error) {
    if (errorStatus(error) === 429) return fail('booking.errors.tooMany')
    throw error
  }

  const briefDate = brief.date ? String(brief.date).slice(0, 10) : null
  // A nearby date chosen in step 2 (US1-S2) or the date asked in step 3 (US1-S3) wins over the brief's.
  const date = details.date ?? briefDate ?? null
  if (!date || date < dubaiToday(now)) return { status: 'error', errors: { date: 'booking.errors.date' } }

  const page = await getMatchPage(brief, locale, now, { date })
  const assigned: { personaId: string; creatorId: string | null }[] = []
  for (const section of page.sections) {
    const pick = picks.find((p) => p.persona === section.persona.slug)
    if (!pick) return fail('booking.errors.unavailable')
    const creator = pick.code ? section.creators.find((c) => c.code === pick.code) : null
    if (pick.code && !creator) return fail('booking.errors.unavailable')
    assigned.push({ personaId: section.persona.id, creatorId: creator?.id ?? null })
  }
  if (!assigned.length) return fail('booking.errors.generic')

  const promo = details.promo ? await findPromo(details.promo) : null
  const [rules, labels] = await Promise.all([getPriceRules(), lineLabels(promo?.code)])
  const quote = quotePrice(rules, {
    personaIds: assigned.map((a) => a.personaId),
    duration: page.facts.duration?.value ?? '',
    location: page.facts.location?.value ?? '',
    custom: { duration: page.facts.duration?.custom, location: page.facts.location?.custom },
    addOnIds: details.addOnIds,
    promo,
    labels,
    now,
  })
  if (!quote.ok) return fail('booking.errors.generic')

  const salt = newSalt()
  const reference = await uniqueReference(payload)
  const validUntil = validUntilFrom(now, settings.quotationValidDays)
  const created = await payload.create({
    collection: 'bookings',
    data: {
      reference,
      state: 'quoted',
      revision: 0,
      brief: brief.id,
      member: user?.id ?? (brief.member ? Number(idOf(brief.member)) : null),
      accessSalt: salt,
      client: { name: details.name, whatsapp: details.whatsapp, locale },
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
  const quotation = await createQuotation(payload, {
    bookingId: created.id,
    briefId: brief.id,
    quote: { ...quote, promoCode: quote.promo?.applied ? quote.promo.code : null },
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
  await recordEvent(payload, { booking: booking.id, event: 'quote', from: null, to: 'quoted', actorRole: 'client', actor: user?.id ?? null, at: now })
  await notify(payload, booking, 'quoted')

  const promoNote = quote.promo && !quote.promo.applied ? `?promo=${quote.promo.reason}` : quote.promo?.applied ? '?promo=applied' : ''
  redirect(`${quotePath(reference, accessKey(salt, 'booking'), locale)}${promoNote}`)
}

/** The page a client action returns to, and the access it was given. */
async function clientAccess(form: FormData) {
  const locale = localeOf(form)
  const ref = str(form, 'ref')
  const key = str(form, 'key')
  const user = await getCurrentUser()
  const access = await getQuotationAccess(ref, key || null, user?.id)
  const path = key ? quotePath(ref, key, locale) : localizeHref(`/account/bookings/${ref}`, locale)
  return { locale, access, user, path }
}

/** Back to the page; a change someone else already made (a double tap) is not an error. */
const finish = (path: string, result: ApplyResult, alreadyIn?: string): never => {
  if (result.ok || (alreadyIn && result.booking?.state === alreadyIn)) back(path)
  back(path, `booking.errors.${result.reason}`)
}

/** Accept the current quotation: the creators' confirmation window starts (US2-S3). */
export async function acceptQuotation(form: FormData): Promise<void> {
  const { access, user, path, locale } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const { booking, quotation, current } = access
  if (quotation.id !== current.id) back(path, 'booking.errors.not-allowed')
  const payload = await getPayloadClient()
  const now = new Date()
  const settings = await readQuickMatch(payload)

  // Every chosen creator must still be listed and free that day (edge case: unlisted after the quotation).
  const brief = await payload.findByID({ collection: 'briefs', id: Number(idOf(booking.brief)), depth: 0, overrideAccess: true })
  const page = await getMatchPage(brief, locale, now, { date: booking.date ?? null })
  const assignments = toAssignments(booking.assignments)
  const gone = assignments.filter((a) => a.creatorId && !page.sections.some((s) => s.persona.id === a.personaId && s.creators.some((c) => c.id === a.creatorId)))
  if (gone.length && booking.state === 'quoted') {
    await applyChange(
      payload,
      booking.id,
      () => ({ ok: true, data: { assignments: toRows(assignments.map((a) => (gone.includes(a) ? { ...a, status: 'lapsed' as const } : a))) }, event: 'unavailable' }),
      { actor: 'system', now },
    )
    back(path, 'booking.errors.creatorUnavailable')
  }

  const result = await applyTransition(payload, booking.id, 'accept', {
    actor: 'client',
    actorUser: user?.id ?? null,
    now,
    data: { assignments: toRows(startAssignments(assignments, now, settings.confirmHours)) },
  })
  if (result.ok && current.promoCode) {
    const promo = await payload.find({ collection: 'promo-codes', where: { code: { equals: current.promoCode } }, limit: 1, depth: 0, overrideAccess: true })
    const row = promo.docs[0]
    if (row) await payload.update({ collection: 'promo-codes', id: row.id, data: { usedCount: (row.usedCount ?? 0) + 1 }, overrideAccess: true, context: { disableRevalidate: true } })
  }
  finish(path, result, 'accepted')
}

/** A client cancels before paying (US3; admins cancel later stages). */
export async function cancelByClient(form: FormData): Promise<void> {
  const { access, user, path } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const payload = await getPayloadClient()
  const result = await applyTransition(payload, access.booking.id, 'cancel', { actor: 'client', actorUser: user?.id ?? null, now: new Date() })
  if (result.ok) await releaseDates(payload, access.booking.id)
  finish(path, result)
}

/** An expired quotation → step 3 again with the same brief and choices, prices recomputed (US2-S5). */
export async function requestFreshQuotation(form: FormData): Promise<void> {
  const { access, path, locale } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const payload = await getPayloadClient()
  const brief = (await payload.findByID({ collection: 'briefs', id: Number(idOf(access.booking.brief)), depth: 0, overrideAccess: true, showHiddenFields: true })) as { reference?: string | null; accessSalt?: string | null }
  let salt = brief.accessSalt
  if (!salt) {
    salt = newSalt()
    await payload.update({ collection: 'briefs', id: Number(idOf(access.booking.brief)), data: { accessSalt: salt } as never, overrideAccess: true, context: { disableRevalidate: true } })
  }
  const personas = await payload.find({ collection: 'personas', where: { id: { in: toAssignments(access.booking.assignments).map((a) => a.personaId) } }, depth: 0, pagination: false, overrideAccess: true })
  const creators = await payload.find({ collection: 'creator-profiles', where: { id: { in: toAssignments(access.booking.assignments).map((a) => a.creatorId).filter(Boolean) as string[] } }, depth: 0, pagination: false, overrideAccess: true, select: { code: true } })
  const picks = toAssignments(access.booking.assignments).map((a) => ({
    persona: personas.docs.find((p) => String(p.id) === a.personaId)?.slug ?? '',
    code: creators.docs.find((c) => String(c.id) === a.creatorId)?.code ?? null,
  }))
  redirect(detailsPath(brief.reference ?? '', accessKey(salt, 'brief'), locale, formatPicks(picks)))
}

/** The client replaces a creator who declined or did not answer, at the same price (US3-S2). */
export async function pickAnotherCreator(form: FormData): Promise<void> {
  const { access, path, locale, user } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const payload = await getPayloadClient()
  const now = new Date()
  const settings = await readQuickMatch(payload)
  const { booking } = access
  const brief = await payload.findByID({ collection: 'briefs', id: Number(idOf(booking.brief)), depth: 0, overrideAccess: true })
  const page = await getMatchPage(brief, locale, now, { date: booking.date ?? null })
  const personaId = str(form, 'persona')
  const creator = page.sections.find((s) => s.persona.id === personaId)?.creators.find((c) => c.code === str(form, 'code').toUpperCase())
  if (!creator) back(path, 'booking.errors.unavailable')
  const result = await applyChange(
    payload,
    booking.id,
    (b) => {
      const list = toAssignments(b.assignments)
      const target = list.find((a) => a.personaId === personaId)
      if (b.state !== 'accepted' || !target || !['open', 'declined', 'lapsed'].includes(target.status)) return { ok: false, reason: 'not-allowed' }
      return { ok: true, data: { assignments: toRows(reassign(list, personaId, creator.id, now, settings.confirmHours, true)) }, event: 'client-pick' }
    },
    { actor: 'client', actorUser: user?.id ?? null, now, notifyAs: 'reassigned', creatorIds: [Number(creator.id)] },
  )
  finish(path, result)
}

/** Client confirms delivery: completed, payout due (US3-S4). */
export async function confirmDelivery(form: FormData): Promise<void> {
  const { access, user, path } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const payload = await getPayloadClient()
  const now = new Date()
  const settings = await readQuickMatch(payload)
  const result = await applyTransition(payload, access.booking.id, 'complete', { actor: 'client', actorUser: user?.id ?? null, now, data: { payoutDueAt: payoutDue(now, settings.payoutDays) } })
  finish(path, result)
}

/** Client reports a problem: on hold for an admin (US3-S4). */
export async function reportProblem(form: FormData): Promise<void> {
  const { access, user, path } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const parsed = reportSchema.safeParse({ reason: str(form, 'reason') })
  if (!parsed.success) back(path, 'booking.errors.reason')
  const payload = await getPayloadClient()
  const result = await applyTransition(payload, access.booking.id, 'hold', { actor: 'client', actorUser: user?.id ?? null, now: new Date(), note: parsed.data.reason, data: { holdReason: parsed.data.reason } })
  finish(path, result)
}

const ACCOUNT_BOOKINGS = (locale: Locale) => localizeHref('/account/bookings', locale)

/** The assigned creator confirms or declines (US3-S1, S2). The first confirmation of a date wins. */
export async function respondToAssignment(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const path = ACCOUNT_BOOKINGS(locale)
  const user = await getCurrentUser()
  if (!user) back(localizeHref('/login', locale))
  const parsed = respondSchema.safeParse({ decision: str(form, 'decision'), reason: str(form, 'reason') || undefined })
  if (!parsed.success) back(path, 'booking.errors.generic')
  const payload = await getPayloadClient()
  const now = new Date()
  const bookingId = Number(str(form, 'booking'))
  const personaId = str(form, 'persona')
  const mine = (await myProfileIds(user.id)).map(String)
  let booking: Booking
  try {
    booking = (await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true })) as Booking
  } catch {
    back(path, 'booking.errors.not-found')
  }
  const list = toAssignments(booking.assignments)
  const target = list.find((a) => a.personaId === personaId)
  if (!target?.creatorId || !mine.includes(target.creatorId)) back(path, 'booking.errors.notYours')
  const creatorId = target.creatorId
  if (booking.state !== 'accepted') back(path, 'booking.errors.not-allowed')
  const answer = respond(list, personaId, creatorId, parsed.data.decision, now, parsed.data.reason)
  if (!answer.ok) back(path, `booking.errors.${answer.reason}`)

  if (parsed.data.decision === 'confirm' && !(await blockDateFor(payload, booking, Number(creatorId)))) {
    const lapsed: Assignment[] = list.map((a) => (a.personaId === personaId ? { ...a, status: 'lapsed', respondedAt: now.toISOString() } : a))
    await applyChange(payload, booking.id, () => ({ ok: true, data: { assignments: toRows(lapsed) }, event: 'date-taken' }), { actor: 'system', now, notifyAs: 'lapsed' })
    back(path, 'booking.errors.dateTaken')
  }

  const actor = { actor: 'creator' as const, actorUser: user.id, now, note: parsed.data.reason ?? null }
  const result = allConfirmed(answer.assignments)
    ? await applyTransition(payload, booking.id, 'confirm', { ...actor, data: { assignments: toRows(answer.assignments) } })
    : await applyChange(payload, booking.id, () => ({ ok: true, data: { assignments: toRows(answer.assignments) }, event: parsed.data.decision }), {
        ...actor,
        notifyAs: parsed.data.decision === 'decline' ? 'declined' : null,
      })
  if (!result.ok && parsed.data.decision === 'confirm') await releaseDates(payload, booking.id, undefined, Number(creatorId))
  finish(path, result)
}

/** The creator (or an admin) marks the work delivered (US3-S4). */
export async function markDelivered(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const path = ACCOUNT_BOOKINGS(locale)
  const user = await getCurrentUser()
  if (!user) back(localizeHref('/login', locale))
  const payload = await getPayloadClient()
  const bookingId = Number(str(form, 'booking'))
  const mine = (await myProfileIds(user.id)).map(String)
  const booking = (await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true }).catch(() => null)) as Booking | null
  if (!booking || !toAssignments(booking.assignments).some((a) => a.creatorId && mine.includes(a.creatorId))) back(path, 'booking.errors.notYours')
  finish(path, await applyTransition(payload, booking.id, 'deliver', { actor: 'creator', actorUser: user.id, now: new Date() }))
}

/** A provider blocks or frees one of their dates (FR-002). */
export async function toggleBlockedDate(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const path = localizeHref('/account/availability', locale)
  const user = await getCurrentUser()
  if (!user) back(localizeHref('/login', locale))
  const [profileId] = await myProfileIds(user.id)
  if (!profileId) back(path, 'availability.errors.notYours')
  const date = str(form, 'date')
  const payload = await getPayloadClient()
  try {
    if (str(form, 'action') === 'block') {
      await payload.create({ collection: 'availability-blocks', data: { creator: profileId, date, kind: 'blocked', user: user.id }, user, overrideAccess: false })
    } else {
      await payload.delete({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profileId } }, { date: { equals: date } }, { kind: { equals: 'blocked' } }] }, user, overrideAccess: false })
    }
  } catch (error) {
    const message = (error as Error).message
    back(path, message.startsWith('availability.') ? message : 'availability.errors.generic')
  }
  back(path)
}

/** Marks one in-app notice as read. */
export async function markNotificationRead(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const user = await getCurrentUser()
  if (!user) back(localizeHref('/login', locale))
  const payload = await getPayloadClient()
  await payload.update({ collection: 'notifications', id: Number(str(form, 'id')), data: { readAt: new Date().toISOString() }, user, overrideAccess: false }).catch(() => null)
  back(ACCOUNT_BOOKINGS(locale))
}
