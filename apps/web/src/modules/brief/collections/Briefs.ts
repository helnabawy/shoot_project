import { briefFingerprint, generateBriefReference } from '@shoot/domain/brief'
import { APIError, type Access, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { hasRole, isAdmin } from '@/shared/payload/access'
import { exportBriefsCsv } from '../export'
import { consumeBriefAllowance, visitorKey } from '../limits'

/** 022: the exact pin and address are read only by the brief's member and admins (FR-005b). */
const readPinIfOwnOrAdmin = ({ req, doc }: { req: { user?: unknown }; doc?: { member?: unknown } }) => {
  const user = req.user as { id?: number } | undefined
  if (hasRole(req.user as never, 'admin')) return true
  const member = doc?.member && typeof doc.member === 'object' ? (doc.member as { id: number }).id : doc?.member
  return Boolean(user?.id && member === user.id)
}
const serverOnly = { create: () => false, update: () => false }

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
    // Only the server action supplies a Quick Match salt (research §2); REST callers cannot set it.
    accessSalt: typeof req.context?.accessSalt === 'string' ? req.context.accessSalt : null,
    // 026: the start time the server read from the brief's answers; REST callers cannot set it.
    startTime: typeof req.context?.startTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(req.context.startTime) ? req.context.startTime : null,
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
    { type: 'row', fields: [
      { name: 'date', type: 'date', admin: { width: '50%', date: { pickerAppearance: 'dayOnly' } } },
      // Feature 026: the start time chosen with the date (HH:MM, 24 h); set by the server only.
      { name: 'startTime', type: 'text', maxLength: 5, access: serverOnly, admin: { width: '50%', readOnly: true, description: 'HH:MM, 24 h. Empty: any time.' } },
    ] },
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
    // Feature 019: the creators who said yes or no to this brief (FR-011).
    { name: 'answers', type: 'join', collection: 'brief-answers', on: 'brief', admin: { defaultColumns: ['creator', 'persona', 'decision', 'amountFils', 'revisions', 'clientDecision', 'reason', 'answeredAt', 'withdrawnAt'] } },
    // Feature 022: creator offers. Set once by the server at sending; never by a client.
    {
      name: 'offers',
      type: 'group',
      admin: { description: 'Creator offers (feature 022): the mode and the fee and range this brief was sent with.' },
      fields: [
        { type: 'row', fields: [
          {
            name: 'mode',
            type: 'select',
            defaultValue: 'fixed',
            options: [
              { label: 'Fixed price', value: 'fixed' },
              { label: 'Creator offers', value: 'offers' },
            ],
            access: serverOnly,
            admin: { readOnly: true, width: '25%' },
          },
          { name: 'feePercent', type: 'number', access: serverOnly, admin: { readOnly: true, width: '25%' } },
          { name: 'minPercent', type: 'number', access: serverOnly, admin: { readOnly: true, width: '25%' } },
          { name: 'maxPercent', type: 'number', access: serverOnly, admin: { readOnly: true, width: '25%' } },
        ] },
        { name: 'sentTo', type: 'number', access: serverOnly, admin: { readOnly: true, description: 'Creators the brief was announced to.' } },
      ],
    },
    {
      name: 'budgets',
      type: 'array',
      access: serverOnly,
      admin: { readOnly: true, description: "The client's price per professional type (whole fils)." },
      fields: [
        { type: 'row', fields: [
          { name: 'persona', type: 'relationship', relationTo: 'personas', required: true },
          { name: 'suggestedFils', type: 'number' },
          { name: 'amountFils', type: 'number', required: true },
        ] },
      ],
    },
    {
      name: 'place',
      type: 'group',
      admin: { description: 'The pinned place (feature 022). Creators only ever get the area and the public point until booked.' },
      fields: [
        { type: 'row', fields: [
          { name: 'lat', type: 'number', access: { ...serverOnly, read: readPinIfOwnOrAdmin as never }, admin: { readOnly: true, width: '25%' } },
          { name: 'lng', type: 'number', access: { ...serverOnly, read: readPinIfOwnOrAdmin as never }, admin: { readOnly: true, width: '25%' } },
          { name: 'publicLat', type: 'number', access: serverOnly, admin: { readOnly: true, width: '25%' } },
          { name: 'publicLng', type: 'number', access: serverOnly, admin: { readOnly: true, width: '25%' } },
        ] },
        { name: 'address', type: 'text', access: { ...serverOnly, read: readPinIfOwnOrAdmin as never }, admin: { readOnly: true } },
        { type: 'row', fields: [
          { name: 'area', type: 'text', access: serverOnly, admin: { readOnly: true, width: '50%' } },
          { name: 'emirate', type: 'relationship', relationTo: 'locations', access: serverOnly, admin: { readOnly: true, width: '50%' } },
        ] },
        { type: 'row', fields: [
          { name: 'placeId', type: 'text', access: serverOnly, admin: { readOnly: true, width: '50%' } },
          {
            name: 'source',
            type: 'select',
            options: ['search', 'drag', 'device', 'fallback'].map((value) => ({ label: value, value })),
            access: serverOnly,
            admin: { readOnly: true, width: '50%' },
          },
        ] },
      ],
    },
    { name: 'sourcePath', type: 'text', admin: { readOnly: true } },
    { name: 'fingerprint', type: 'text', index: true, admin: { hidden: true } },
    // Quick Match private link (research §2): set by the server action only, never readable through the API.
    { name: 'accessSalt', type: 'text', access: { read: () => false, create: () => false, update: () => false }, admin: { hidden: true } },
    // Honeypot: real visitors never fill this in; it is not stored.
    { name: 'website', type: 'text', virtual: true, admin: { hidden: true } },
  ],
}
