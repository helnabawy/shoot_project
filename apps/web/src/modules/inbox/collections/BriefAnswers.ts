import { APIError, type Access, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
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
    defaultColumns: ['brief', 'creator', 'persona', 'decision', 'reason', 'answeredAt', 'withdrawnAt'],
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
  ],
}
