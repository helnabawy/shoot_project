import { briefFingerprint, generateBriefReference } from '@shoot/domain/brief'
import { APIError, type Access, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { hasRole, isAdmin } from '@/shared/payload/access'
import { exportBriefsCsv } from '../export'
import { consumeBriefAllowance, visitorKey } from '../limits'

const readOwnOrAll: Access = ({ req }) => {
  if (hasRole(req.user as never, 'admin')) return true
  return req.user ? { member: { equals: req.user.id } } : false
}

/** Honeypot, rate limit, reference, member and fingerprint are decided here, not by the client. */
const prepareBrief: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create') return data
  if (typeof data.website === 'string' && data.website.trim()) {
    throw new APIError('Rejected.', 400, undefined, true)
  }
  delete data.website
  // Only the server action may attach a creator (it resolves the code first); a client value is dropped.
  if (!req.context?.creatorResolved) delete data.creator
  const isMember = Boolean(req.user && req.user.collection === 'users')
  if (!isMember) {
    const settings = await req.payload.findGlobal({ slug: 'site-settings', depth: 0, req })
    await consumeBriefAllowance(req, settings.briefLimitPerHour ?? 5)
  }
  let reference = generateBriefReference()
  for (let i = 0; i < 5; i += 1) {
    const clash = await req.payload.count({ collection: 'briefs', where: { reference: { equals: reference } }, req })
    if (!clash.totalDocs) break
    reference = generateBriefReference()
  }
  const selections = (data.selections ?? []) as { token: string; value: string }[]
  return {
    ...data,
    reference,
    status: 'new',
    member: isMember ? req.user?.id : null,
    fingerprint: briefFingerprint(selections, visitorKey(req)),
  }
}

export const Briefs: CollectionConfig = {
  slug: 'briefs',
  labels: { singular: 'Brief', plural: 'Briefs' },
  admin: {
    group: 'Brief builder',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'sentence', 'status', 'date', 'createdAt'],
    listSearchableFields: ['reference', 'sentence'],
    description: 'Every brief visitors send. Set the status once someone has replied.',
    components: { beforeListTable: ['/modules/admin/components/BriefsExport#BriefsExport'] },
  },
  endpoints: [exportBriefsCsv],
  access: { create: () => true, read: readOwnOrAll, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  hooks: { beforeChange: [prepareBrief] },
  fields: [
    { name: 'reference', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'sentence', type: 'text', admin: { readOnly: true } },
    // Every professional type the visitor chose, in their order (FR-063).
    { name: 'persona', type: 'relationship', relationTo: 'personas', hasMany: true, required: true },
    {
      name: 'selections',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        { type: 'row', fields: [
          { name: 'token', type: 'text', required: true },
          { name: 'value', type: 'text' },
          { name: 'label', type: 'text' },
          { name: 'custom', type: 'checkbox', defaultValue: false },
        ] },
      ],
    },
    { name: 'date', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'العربية', value: 'ar' },
      ],
    },
    { name: 'member', type: 'relationship', relationTo: 'users', index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'whatsapp', type: 'text' },
      ],
    },
    // The creator this brief was sent to, set by the server action only (feature 002).
    { name: 'creator', type: 'relationship', relationTo: 'creator-profiles', index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'sourcePath', type: 'text', admin: { readOnly: true } },
    { name: 'fingerprint', type: 'text', index: true, admin: { hidden: true } },
    // Honeypot: real visitors never fill this in; it is not stored.
    { name: 'website', type: 'text', virtual: true, admin: { hidden: true } },
  ],
}
