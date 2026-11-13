import 'server-only'
import type { BriefAnswerRequestV1, CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { problem, type Problem } from '@/shared/api/problem'
import { creatorInbox, rejectReasons } from '../queries'
import { stillOpen } from './shared'
import { answerRow, briefByRef, briefClosed, inboxOf, notProvider, profileFor, type InboxActor } from './shared'

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
  const data = {
    decision,
    reason: decision === 'rejected' ? (body.reason ?? null) : null,
    note: decision === 'rejected' ? (body.note?.trim() || null) : null,
    answeredAt: actor.now.toISOString(),
    withdrawnAt: null,
  } as const
  const row = await answerRow(payload, brief.id, profile.id, body.persona)
  const same = row && !row.withdrawnAt && row.decision === decision && (row.reason ?? null) === data.reason && (row.note ?? null) === data.note
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
    if (newlyAccepted && onAccepted) await onAccepted(actor, { briefId: brief.id, creatorId: profile.id, personaId: body.persona })
  }
  return inboxOf(actor)
}
