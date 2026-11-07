import type { CollectionConfig } from 'payload'
import { isEditor } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { activeOrEditor } from '../access'
import { requireOptionValue } from '../guards'

export const TravelFees: CollectionConfig = {
  slug: 'travel-fees',
  labels: { singular: 'Travel fee', plural: 'Travel fees' },
  admin: {
    group: 'Prices',
    useAsTitle: 'location',
    defaultColumns: ['location', 'fee', 'active'],
    description: 'Charged once per professional. A location without a fee is priced on WhatsApp instead of a quotation.',
  },
  access: { read: activeOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    beforeValidate: [requireOptionValue('travel-fees', 'location', 'locations', 'pricing.location.unknown')],
    afterChange: [revalidateTagAfterChange('pricing')],
    afterDelete: [revalidateTagAfterDelete('pricing')],
  },
  fields: [
    { name: 'location', type: 'text', required: true, unique: true, index: true, admin: { description: 'A value from the Locations option set, e.g. dubai.' } },
    { name: 'fee', type: 'number', required: true, min: 0, admin: { step: 0.01, description: 'AED. 0 = no travel fee.' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
