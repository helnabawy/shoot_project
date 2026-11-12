'use server'

import {
  allConfirmed,
  detailsSchema,
  formatPicks,
  parsePicks,
  respond,
  respondSchema,
  type Assignment,
} from '@shoot/domain/booking'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createLocalReq } from 'payload'
import { getCurrentUser } from '@/modules/auth/session'
import type { Booking } from '@/payload-types'
import { localizeHref } from '@/shared/i18n/href'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { visitorKey } from '@/shared/payload/rate-limit'
import {
  acceptQuotation as accept,
  cancelBooking,
  confirmDelivery as confirm,
  freshQuotation,
  pickAnother,
  reportProblem as report,
  type CommandResult,
} from './commands/client-actions'
import { issueQuotation } from './commands/issue-quotation'
import { blockDateFor, releaseDates } from './effects'
import { getBriefByKey } from './match'
import { notify } from './notify'
import { detailsPath, quotePath } from './paths'
import { getQuotationAccess, myProfileIds } from './queries'
import { toAssignments, toRows } from './rows'
import { applyChange, applyTransition } from './transitions'

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

/** Step 3 → a quotation and a booking in "quoted" (US2-S1, FR-001, FR-004, FR-010); the body is `commands/issue-quotation.ts`. */
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
  const req = await visitorReq()
  const result = await issueQuotation(payload, {
    brief,
    picks,
    locale,
    now,
    userId: user?.id ?? null,
    client: { name: details.name, whatsapp: details.whatsapp },
    date: details.date,
    addOnIds: details.addOnIds,
    promo: details.promo,
    req,
    limitKey: `quote:${visitorKey(req)}`,
  })
  if (!result.ok) return result.errors ? { status: 'error', errors: result.errors } : fail(result.formError)
  redirect(`${quotePath(result.reference, result.key, locale)}${result.promoNote}`)
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

/** Back to the page, with the command's reason as the error key when it refused. */
const finish = (path: string, result: CommandResult): never => (result.ok ? back(path) : back(path, `booking.errors.${result.reason}`))

/** Accept the current quotation: the creators' confirmation window starts (US2-S3). */
export async function acceptQuotation(form: FormData): Promise<void> {
  const { access, user, path, locale } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  finish(path, await accept(await getPayloadClient(), access, { user, now: new Date(), locale }))
}

/** A client cancels before paying (US3; admins cancel later stages). */
export async function cancelByClient(form: FormData): Promise<void> {
  const { access, user, path } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  finish(path, await cancelBooking(await getPayloadClient(), access, { user, now: new Date() }))
}

/** An expired quotation → step 3 again with the same brief and choices, prices recomputed (US2-S5). */
export async function requestFreshQuotation(form: FormData): Promise<void> {
  const { access, path, locale } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  const fresh = await freshQuotation(await getPayloadClient(), access)
  redirect(detailsPath(fresh.briefReference, fresh.briefKey, locale, formatPicks(fresh.picks)))
}

/** The client replaces a creator who declined or did not answer, at the same price (US3-S2). */
export async function pickAnotherCreator(form: FormData): Promise<void> {
  const { access, path, locale, user } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  finish(path, await pickAnother(await getPayloadClient(), access, { user, now: new Date(), locale, personaId: str(form, 'persona'), code: str(form, 'code') }))
}

/** Client confirms delivery: completed, payout due (US3-S4). */
export async function confirmDelivery(form: FormData): Promise<void> {
  const { access, user, path } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  finish(path, await confirm(await getPayloadClient(), access, { user, now: new Date() }))
}

/** Client reports a problem: on hold for an admin (US3-S4). */
export async function reportProblem(form: FormData): Promise<void> {
  const { access, user, path } = await clientAccess(form)
  if (!access) back(path, 'booking.errors.not-found')
  finish(path, await report(await getPayloadClient(), access, { user, now: new Date(), reason: str(form, 'reason') }))
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

/**
 * A provider blocks or frees one of their dates (FR-002). The profile's calendar (CP-FR-014) sends
 * `from=profile` and one button per day carrying both as `toggle=block:YYYY-MM-DD`; it stays on the
 * profile page, which refreshes in place, and an error comes back to the calendar.
 */
export async function toggleBlockedDate(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const fromProfile = str(form, 'from') === 'profile'
  const path = localizeHref(fromProfile ? '/account/profile' : '/account/availability', locale)
  const fail = (error: string): never => (fromProfile ? redirect(`${path}?error=${encodeURIComponent(error)}#sec-calendar`) : back(path, error))
  const user = await getCurrentUser()
  if (!user) back(localizeHref('/login', locale))
  const [profileId] = await myProfileIds(user.id)
  if (!profileId) fail('availability.errors.notYours')
  const [verb, day] = str(form, 'toggle').split(':')
  const block = (day ? verb : str(form, 'action')) === 'block'
  const date = day ?? str(form, 'date')
  const payload = await getPayloadClient()
  try {
    if (block) {
      await payload.create({ collection: 'availability-blocks', data: { creator: profileId, date, kind: 'blocked', user: user.id }, user, overrideAccess: false })
    } else {
      await payload.delete({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profileId } }, { date: { equals: date } }, { kind: { equals: 'blocked' } }] }, user, overrideAccess: false })
    }
  } catch (error) {
    const message = (error as Error).message
    fail(message.startsWith('availability.') ? message : 'availability.errors.generic')
  }
  if (!fromProfile) back(path)
  revalidatePath(path)
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
