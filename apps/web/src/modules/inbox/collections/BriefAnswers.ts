import { APIError, type Access, type CollectionBeforeValidateHook, type CollectionConfig, type FieldHook } from 'payload'
import { hasRole, nobody } from '@/shared/payload/access'

/** Admins read every answer; a creator reads only the answers given for their own profiles. */
const readOwnOrAll: Access = ({ req }) => {
  if (hasRole(req.user as never, 'admin')) return true
  return req.user ? { 'creator.user': { equals: req.user.id } } : false
}

/** A reason and a note belong to a rejection only (data-model.md). */
const onlyRejectionsCarryReasons: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const merged = { ...originalDoc, ...data } as { decision?: string; reason?: string | null; note?: string | null }
  if (merged.decision === 'accepted' && (merged.reason || merged.note)) throw new APIError('inbox.errors.reasonUnknown', 400, undefined, true)
  return data
}

const relId = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))

/**
 * Where an answer stands now, for the team (US2-S8, FR-011): withdrawn, the creator's profile hidden,
 * the creator no longer free on the brief's day, or still listed. Read-only, computed on read.
 */
const statusNow: FieldHook = async ({ data, req }) => {
  if (!data) return null
  if (data.withdrawnAt) return 'withdrawn'
  const creator = relId(data.creator)
  const listing = (await req.payload.find({ collection: 'creator-listings', where: { profile: { equals: creator } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as
    | { active?: boolean | null; suspended?: boolean | null }
    | undefined
  if (!listing || listing.active === false || listing.suspended) return 'profile hidden'
  const brief = (await req.payload.findByID({ collection: 'briefs', id: relId(data.brief), depth: 0, overrideAccess: true, req }).catch(() => null)) as { date?: string | null } | null
  const day = brief?.date ? String(brief.date).slice(0, 10) : null
  if (day && data.decision === 'accepted') {
    const blocked = await req.payload.count({ collection: 'availability-blocks', where: { and: [{ creator: { equals: creator } }, { date: { equals: day } }] }, overrideAccess: true, req })
    if (blocked.totalDocs) return 'not free any more'
  }
  return 'listed'
}

/**
 * One creator's answer to one brief for one professional type (feature 019, research R3). Written only by
 * the inbox commands; undo and withdraw set `withdrawnAt` so the team keeps the history (FR-011).
 */
export const BriefAnswers: CollectionConfig = {
  slug: 'brief-answers',
  labels: { singular: 'Brief answer', plural: 'Brief answers' },
  admin: {
    group: 'Brief builder',
    useAsTitle: 'decision',
    defaultColumns: ['brief', 'creator', 'persona', 'decision', 'reason', 'statusNow', 'answeredAt'],
    description: 'Creators who said yes or no to a brief. Read-only.',
  },
  access: { read: readOwnOrAll, create: nobody, update: nobody, delete: nobody },
  defaultSort: '-answeredAt',
  hooks: { beforeValidate: [onlyRejectionsCarryReasons] },
  indexes: [{ fields: ['brief', 'creator', 'persona'], unique: true }],
  fields: [
    { name: 'brief', type: 'relationship', relationTo: 'briefs', required: true, index: true, admin: { readOnly: true } },
    { name: 'creator', type: 'relationship', relationTo: 'creator-profiles', required: true, index: true, admin: { readOnly: true } },
    { name: 'persona', type: 'relationship', relationTo: 'personas', required: true, admin: { readOnly: true } },
    {
      name: 'decision',
      type: 'select',
      required: true,
      options: [
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: { readOnly: true },
    },
    // The value of a `brief-reject-reasons` option; only with `rejected`.
    { name: 'reason', type: 'text', maxLength: 64, admin: { readOnly: true } },
    // Only with `rejected`; never shown to the client.
    { name: 'note', type: 'textarea', maxLength: 300, admin: { readOnly: true } },
    { name: 'answeredAt', type: 'date', required: true, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'withdrawnAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    // Computed for the team; never stored.
    { name: 'statusNow', label: 'Status now', type: 'text', virtual: true, admin: { readOnly: true }, hooks: { afterRead: [statusNow] } },
  ],
}
