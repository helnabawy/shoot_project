import type { CollectionConfig } from 'payload'
import { isEditor } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { activeOrEditor } from '../access'

export const AddOns: CollectionConfig = {
  slug: 'add-ons',
  labels: { singular: 'Extra', plural: 'Extras' },
  admin: { group: 'Prices', useAsTitle: 'title', defaultColumns: ['title', 'price', 'personas', 'active'], description: 'Optional extras the client can add in step 3. Charged once per booking.' },
  access: { read: activeOrEditor, create: isEditor, update: isEditor, delete: isEditor },
  defaultSort: 'order',
  hooks: { afterChange: [revalidateTagAfterChange('pricing')], afterDelete: [revalidateTagAfterDelete('pricing')] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, maxLength: 60 },
    { name: 'description', type: 'text', localized: true, maxLength: 160 },
    { name: 'price', type: 'number', required: true, min: 0, admin: { step: 0.01, description: 'AED' } },
    { name: 'personas', type: 'relationship', relationTo: 'personas', hasMany: true, admin: { description: 'Empty: offered with every professional type.' } },
    { type: 'row', fields: [
      { name: 'active', type: 'checkbox', defaultValue: true },
      { name: 'order', type: 'number', defaultValue: 100 },
    ] },
  ],
}
