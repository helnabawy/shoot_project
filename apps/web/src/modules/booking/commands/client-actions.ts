import 'server-only'
import { allConfirmed, formatPicks, preconfirm, reassign, reportSchema, startAssignments, type Assignment, type Pick } from '@shoot/domain/booking'
import type { Payload } from 'payload'
import type { Locale } from '@/shared/lib/locale'
import { blockDateFor, releaseDates } from '../effects'
import { accessKey, newSalt } from '../keys'
import { acceptedFor, getMatchPage } from '../match'
import type { QuotationAccess } from '../queries'
import { idOf, toAssignments, toRows } from '../rows'
import { payoutDue, readQuickMatch } from '../settings'
import { applyChange, applyTransition, type ApplyResult } from '../transitions'

/**
 * The client's booking commands, shared by the website's server actions and the mobile API
 * (feature 012, 008's extraction rule). Each takes what the caller resolved (the payload client, the
 * quotation access, the member) and answers `{ ok }` or a reason, the tail of a `booking.errors.*`
 * key. They never redirect, read cookies or read the clock.
 */

export type CommandResult = { ok: true } | { ok: false; reason: string }

interface Who {
  user: { id: number } | null
  now: Date
}

const ok: CommandResult = { ok: true }

/** A change someone else already made (a double tap) is not an error. */
function finish(result: ApplyResult, alreadyIn?: string): CommandResult {
  if (result.ok || (alreadyIn && result.booking?.state === alreadyIn)) return ok
  return { ok: false, reason: result.reason }
}

/** Accept the current quotation: the creators' confirmation window starts (US2-S3). */
export async function acceptQuotation(payload: Payload, access: QuotationAccess, who: Who & { locale: Locale }): Promise<CommandResult> {
  const { booking, quotation, current } = access
  if (quotation.id !== current.id) return { ok: false, reason: 'not-allowed' }
  const { now, user, locale } = who
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
    return { ok: false, reason: 'creatorUnavailable' }
  }

  // 019 (US2-S4): a picked creator who already said yes to the brief starts confirmed, once their day is
  // held for this booking; if the day was taken meanwhile they answer as usual within the window.
  const started = startAssignments(assignments, now, settings.confirmHours)
  const pre = booking.state === 'quoted' ? preconfirm(started, await acceptedFor(brief.id), now) : { assignments: started, confirmed: [] }
  const held: number[] = []
  let final: Assignment[] = pre.assignments
  for (const c of pre.confirmed) {
    if (await blockDateFor(payload, booking, Number(c.creatorId))) held.push(Number(c.creatorId))
    else final = final.map((a) => (a.personaId === c.personaId ? (started.find((s) => s.personaId === c.personaId) ?? a) : a))
  }
  const result = await applyTransition(payload, booking.id, 'accept', {
    actor: 'client',
    actorUser: user?.id ?? null,
    now,
    data: { assignments: toRows(final) },
  })
  if (!result.ok) {
    for (const creatorId of held) await releaseDates(payload, booking.id, undefined, creatorId)
  } else if (held.length && allConfirmed(final)) {
    // The creator confirmed by saying yes to the brief: the step is theirs, noted as such in the audit trail.
    await applyTransition(payload, booking.id, 'confirm', { actor: 'creator', now, note: 'brief-accepted', data: { assignments: toRows(final) } })
  }
  if (result.ok && current.promoCode) {
    const promo = await payload.find({ collection: 'promo-codes', where: { code: { equals: current.promoCode } }, limit: 1, depth: 0, overrideAccess: true })
    const row = promo.docs[0]
    if (row) await payload.update({ collection: 'promo-codes', id: row.id, data: { usedCount: (row.usedCount ?? 0) + 1 }, overrideAccess: true, context: { disableRevalidate: true } })
  }
  return finish(result, 'accepted')
}

/** A client cancels before paying (US3; admins cancel later stages). */
export async function cancelBooking(payload: Payload, access: QuotationAccess, who: Who): Promise<CommandResult> {
  const result = await applyTransition(payload, access.booking.id, 'cancel', { actor: 'client', actorUser: who.user?.id ?? null, now: who.now })
  if (result.ok) await releaseDates(payload, access.booking.id)
  return finish(result)
}

/** An expired quotation → step 3 again with the same brief and choices (US2-S5): the brief's link and the picks. */
export async function freshQuotation(payload: Payload, access: QuotationAccess): Promise<{ briefReference: string; briefKey: string; picks: Pick[] }> {
  const briefId = Number(idOf(access.booking.brief))
  const brief = (await payload.findByID({ collection: 'briefs', id: briefId, depth: 0, overrideAccess: true, showHiddenFields: true })) as { reference?: string | null; accessSalt?: string | null }
  let salt = brief.accessSalt
  if (!salt) {
    salt = newSalt()
    await payload.update({ collection: 'briefs', id: briefId, data: { accessSalt: salt } as never, overrideAccess: true, context: { disableRevalidate: true } })
  }
  const assignments = toAssignments(access.booking.assignments)
  const personas = await payload.find({ collection: 'personas', where: { id: { in: assignments.map((a) => a.personaId) } }, depth: 0, pagination: false, overrideAccess: true })
  const creators = await payload.find({ collection: 'creator-profiles', where: { id: { in: assignments.map((a) => a.creatorId).filter(Boolean) as string[] } }, depth: 0, pagination: false, overrideAccess: true, select: { code: true } })
  const picks = assignments.map((a) => ({
    persona: personas.docs.find((p) => String(p.id) === a.personaId)?.slug ?? '',
    code: creators.docs.find((c) => String(c.id) === a.creatorId)?.code ?? null,
  }))
  return { briefReference: brief.reference ?? '', briefKey: accessKey(salt, 'brief'), picks }
}

/** The query string the website's step 3 reads the picks from. */
export const picksQuery = (picks: Pick[]) => formatPicks(picks)

/** The client replaces a creator who declined or did not answer, at the same price (US3-S2). */
export async function pickAnother(payload: Payload, access: QuotationAccess, who: Who & { locale: Locale; personaId: string; code: string }): Promise<CommandResult> {
  const { booking } = access
  const { now, user, locale, personaId } = who
  const settings = await readQuickMatch(payload)
  const brief = await payload.findByID({ collection: 'briefs', id: Number(idOf(booking.brief)), depth: 0, overrideAccess: true })
  const page = await getMatchPage(brief, locale, now, { date: booking.date ?? null })
  const creator = page.sections.find((s) => s.persona.id === personaId)?.creators.find((c) => c.code === who.code.toUpperCase())
  if (!creator) return { ok: false, reason: 'unavailable' }
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
  return finish(result)
}

/** Client confirms delivery: completed, payout due (US3-S4). */
export async function confirmDelivery(payload: Payload, access: QuotationAccess, who: Who): Promise<CommandResult> {
  const settings = await readQuickMatch(payload)
  const result = await applyTransition(payload, access.booking.id, 'complete', {
    actor: 'client',
    actorUser: who.user?.id ?? null,
    now: who.now,
    data: { payoutDueAt: payoutDue(who.now, settings.payoutDays) },
  })
  return finish(result, 'completed')
}

/** Client reports a problem: on hold for an admin (US3-S4). The reason is checked here, as the schema says. */
export async function reportProblem(payload: Payload, access: QuotationAccess, who: Who & { reason: string }): Promise<CommandResult> {
  const parsed = reportSchema.safeParse({ reason: who.reason })
  if (!parsed.success) return { ok: false, reason: 'reason' }
  const result = await applyTransition(payload, access.booking.id, 'hold', {
    actor: 'client',
    actorUser: who.user?.id ?? null,
    now: who.now,
    note: parsed.data.reason,
    data: { holdReason: parsed.data.reason },
  })
  return finish(result, 'on-hold')
}
