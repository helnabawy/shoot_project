import 'server-only'
import type { CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { problem, type Problem } from '@/shared/api/problem'
import { answerRow, briefByRef, briefClosed, inboxOf, notProvider, profileFor, type InboxActor } from './shared'

/**
 * Undo a rejection or withdraw an acceptance while the brief is open (US2-S9, US3-S4). An acceptance cannot
 * be withdrawn once the client picked this creator (a quotation names them). Unknown answers are a no-op.
 */
export async function withdrawAnswer(actor: InboxActor, ref: string, personaId: string): Promise<CreatorBriefsV1 | Problem> {
  if (actor.user?.accountType !== 'provider') return notProvider()
  const { payload } = actor
  const [brief, profile] = await Promise.all([briefByRef(payload, ref), profileFor(actor, personaId)])
  if (!brief || !profile) return briefClosed()
  const row = await answerRow(payload, brief.id, profile.id, personaId)
  if (!row || row.withdrawnAt) return inboxOf(actor)
  const before = await inboxOf(actor)
  if ('status' in before) return before
  const item = [...before.accepted, ...before.rejected].find((i) => i.ref === brief.reference && i.persona === personaId)
  if (!item || item.outcome !== 'open') return briefClosed()
  if (row.decision === 'accepted') {
    const picked = await payload.count({
      collection: 'bookings',
      where: { and: [{ brief: { equals: brief.id } }, { state: { equals: 'quoted' } }, { 'assignments.creator': { equals: Number(profile.id) } }] },
      overrideAccess: true,
    })
    if (picked.totalDocs) return problem(409, 'inbox.errors.alreadyPicked')
  }
  await payload.update({ collection: 'brief-answers', id: row.id, data: { withdrawnAt: actor.now.toISOString() }, overrideAccess: true })
  return inboxOf(actor)
}
