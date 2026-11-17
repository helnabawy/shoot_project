import 'server-only'
import type { Payload } from 'payload'
import { problem, type Problem } from '@/shared/api/problem'
import type { Brief, BriefAnswer } from '@/payload-types'
import { onOfferClosed } from './notify-brief'
import { offerLocked, offerTermsOf } from './shared'

/**
 * 022 (US4-S5, FR-014): the client declines one creator's offer for one type. The caller has already
 * authorised the brief by its private key. The offer disappears for the client, the creator is told, and
 * that creator cannot offer again on the brief. Declining twice changes nothing.
 */
export async function declineOffer(
  payload: Payload,
  brief: Brief,
  input: { personaId: string; creatorId: string; now: Date },
): Promise<{ ok: true } | Problem> {
  if (!offerTermsOf(brief)) return problem(409, 'offers.errors.pickFromOffers')
  const { docs } = await payload.find({
    collection: 'brief-answers',
    where: { and: [{ brief: { equals: brief.id } }, { creator: { equals: Number(input.creatorId) } }, { persona: { equals: Number(input.personaId) } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const row = docs[0] as (BriefAnswer & { clientDecision?: string | null }) | undefined
  if (!row || row.withdrawnAt || row.decision !== 'accepted') return problem(404, 'api.errors.notFound')
  if (row.clientDecision === 'declined') return { ok: true }
  // A quotation already includes this offer: go back to the offers by choosing another first.
  if (await offerLocked(payload, brief.id, input.creatorId, input.personaId)) return problem(409, 'inbox.errors.alreadyPicked')
  await payload.update({ collection: 'brief-answers', id: row.id, data: { clientDecision: 'declined', clientDecidedAt: input.now.toISOString() } as never, overrideAccess: true })
  await onOfferClosed(payload, { briefId: brief.id, creatorId: input.creatorId, event: 'offer-declined' })
  return { ok: true }
}
