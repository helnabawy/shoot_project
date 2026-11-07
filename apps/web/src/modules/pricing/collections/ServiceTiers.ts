import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { isEditor } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { activeOrEditor } from '../access'
import { requireOptionValue } from '../guards'

const relId = (v: unknown) => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)

/** One active tier per professional type and duration, so a brief has exactly one price. */
const oneActiveTier: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const next = { ...originalDoc, ...data } as { persona?: unknown; duration?: string; active?: boolean; id?: number }
  if (next.active === false || !next.persona || !next.duration) return data
  const clash = await req.payload.count({
    collection: 'service-tiers',
    where: {
      and: [
        { persona: { equals: relId(next.persona) } },
        { duration: { equals: next.duration } },
        { active: { equals: true } },
        ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
    req,
    overrideAccess: true,
  })
  if (clash.totalDocs) throw new ValidationError({ collection: 'service-tiers', errors: [{ path: 'duration', message: 'pricing.tier.duplicate' }], req })
  return data
}

export const ServiceTiers: CollectionConfig = {
  slug: 'service-tiers',
  labels: { singular: 'Service tier', plural: 'Service tiers' },
  admin: {
    group: 'Prices',
    useAsTitle: 'title',
    defaultColumns: ['title', 'persona', 'duration', 'price', 'active'],
    description: 'One row per professional type and duration. Prices in AED, VAT included. Quotations already issued keep their price.',
  },
  access: { read: activeOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  defaultSort: 'order',
  hooks: {
    beforeValidate: [requireOptionValue('service-tiers', 'duration', 'durations', 'pricing.duration.unknown'), oneActiveTier],
    afterChange: [revalidateTagAfterChange('pricing')],
    afterDelete: [revalidateTagAfterDelete('pricing')],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, maxLength: 60, admin: { description: 'Shown on the quotation, e.g. "2-hour photo shoot".' } },
    { type: 'row', fields: [
      { name: 'persona', type: 'relationship', relationTo: 'personas', required: true, index: true, admin: { width: '40%' } },
      { name: 'duration', type: 'text', required: true, index: true, admin: { width: '30%', description: 'A value from the Durations option set, e.g. 2h.' } },
      { name: 'price', type: 'number', required: true, min: 0, admin: { width: '30%', step: 0.01, description: 'AED' } },
    ] },
    {
      name: 'deliverables',
      type: 'array',
      maxRows: 8,
      labels: { singular: 'Deliverable', plural: 'Deliverables' },
      fields: [{ name: 'text', type: 'text', required: true, localized: true, maxLength: 80 }],
    },
    { type: 'row', fields: [
      { name: 'active', type: 'checkbox', defaultValue: true, index: true },
      { name: 'order', type: 'number', defaultValue: 100 },
    ] },
  ],
}
