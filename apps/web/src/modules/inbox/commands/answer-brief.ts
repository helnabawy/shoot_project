import 'server-only'
import type { BriefAnswerRequestV1, CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { canChange, inRange } from '@shoot/domain/booking'
import { problem, type Problem } from '@/shared/api/problem'
import { creatorInbox, rejectReasons } from '../queries'
import { stillOpen } from './shared'
import { answerRow, briefByRef, briefClosed, inboxOf, notProvider, offerLocked, offerStateOf, offerTermsOf, profileFor, type InboxActor } from './shared'
import { onOffer } from './notify-brief'

/** Runs after a new acceptance is recorded (notifications, US4); set by the inbox module at start-up. */
export type OnAccepted = (actor: InboxActor, input: { briefId: number; creatorId: string; personaId: string }) => void | Promise<void>

/**
 * A creator says yes or no to an open brief for one professional type (US2, US3, FR-006, FR-008). The brief
 * is checked again when the answer arrives: it must still be open and, to accept, still match the creator.
 * Repeating the same answer records nothing new. Returns the creator's whole inbox.
 */
export async function answerBrief(actor: InboxActor, ref: string, body: BriefAnswerRequestV1, onAccepted?: OnAccepted): Promise<CreatorBriefsV1 | Problem> {
  if (actor.user?.accountType !== 'provider') return notProvider()
  const { payload } = actor
  const [brief, profile] = await Promise.all([briefByRef(payload, ref), profileFor(actor, body.persona)])
  if (!brief || !profile) return briefClosed()
  const before = await creatorInbox({ payload, locale: actor.locale, now: actor.now }, actor.user.id)
  const item = (list: keyof Pick<CreatorBriefsV1, 'open' | 'accepted' | 'rejected'>) => before?.[list].find((i) => i.ref === brief.reference && i.persona === body.persona)
  const shown = item('open') ?? item('accepted') ?? item('rejected')
  if (shown && shown.outcome !== 'open') return briefClosed()
  // Not in the inbox: either the brief closed, or it is open and no longer matches this creator.
  if (!shown) return (await stillOpen(actor, brief)) ? problem(409, 'inbox.errors.notMatching') : briefClosed()
  if (body.decision === 'reject' && body.reason && !(await rejectReasons(payload, actor.locale)).some((r) => r.value === body.reason)) {
    return problem(422, 'inbox.errors.reasonUnknown', { fields: [{ path: 'body.reason', code: 'inbox.errors.reasonUnknown' }] })
  }

  const decision = body.decision === 'accept' ? 'accepted' : 'rejected'
  const row = await answerRow(payload, brief.id, profile.id, body.persona)

  // 022: in an offers brief an acceptance is an offer: an amount within the range (default the client's
  // price, FR-011), at most three changes, final once the client declined, locked while quoted (FR-009, FR-010).
  const terms = offerTermsOf(brief)
  let amountFils: number | null = null
  let revisions = (row as { revisions?: number | null } | null)?.revisions ?? 0
  if (terms) {
    const state = offerStateOf(row, await offerLocked(payload, brief.id, profile.id, body.persona))
    const current = state && !state.withdrawn && state.decision === 'accepted' ? ((row as { amountFils?: number | null }).amountFils ?? null) : null
    if (decision === 'accepted') {
      amountFils = body.amountFils ?? terms.budgetFor(body.persona)?.amountFils ?? null
      if (amountFils === null || !inRange(amountFils, terms.rangeFor(body.persona))) {
        return problem(422, 'offers.errors.outOfRange', { fields: [{ path: 'body.amountFils', code: 'offers.errors.outOfRange' }] })
      }
      if (current === amountFils) return inboxOf(actor)
      const verdict = canChange(state)
      if (verdict === 'declined') return problem(409, 'offers.errors.declined')
      if (verdict === 'picked') return problem(409, 'inbox.errors.alreadyPicked')
      if (verdict === 'tooManyChanges') return problem(409, 'offers.errors.tooManyChanges')
      revisions = current !== null ? revisions + 1 : state?.withdrawn || state?.decision === 'rejected' ? revisions : 0
    } else if (state?.locked) {
      return problem(409, 'inbox.errors.alreadyPicked')
    }
  }

  const data = {
    decision,
    reason: decision === 'rejected' ? (body.reason ?? null) : null,
    note: decision === 'rejected' ? (body.note?.trim() || null) : null,
    answeredAt: actor.now.toISOString(),
    withdrawnAt: null,
    ...(terms ? { amountFils, revisions } : {}),
  } as const
  const same = !terms && row && !row.withdrawnAt && row.decision === decision && (row.reason ?? null) === data.reason && (row.note ?? null) === data.note
  if (!same) {
    if (row) {
      await payload.update({ collection: 'brief-answers', id: row.id, data, overrideAccess: true })
    } else {
      try {
        await payload.create({ collection: 'brief-answers', data: { ...data, brief: brief.id, creator: Number(profile.id), persona: Number(body.persona) }, overrideAccess: true })
      } catch (error) {
        // Two taps at once: the unique (brief, creator, persona) row exists now; write the answer to it.
        const existing = await answerRow(payload, brief.id, profile.id, body.persona)
        if (!existing) throw error
        await payload.update({ collection: 'brief-answers', id: existing.id, data, overrideAccess: true })
      }
    }
    const newlyAccepted = decision === 'accepted' && !(row && !row.withdrawnAt && row.decision === 'accepted')
    if (terms && decision === 'accepted' && amountFils !== null) {
      // 022: the client hears about every new or changed offer, once each (US4-S9).
      const saved = await answerRow(payload, brief.id, profile.id, body.persona)
      if (saved) await onOffer(actor, { briefId: brief.id, creatorId: profile.id, personaId: body.persona, answerId: saved.id, revisions, amountFils })
    } else if (newlyAccepted && onAccepted) {
      await onAccepted(actor, { briefId: brief.id, creatorId: profile.id, personaId: body.persona })
    }
  }
  return inboxOf(actor)
}
