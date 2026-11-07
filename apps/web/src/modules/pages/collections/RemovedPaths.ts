import type { CollectionConfig } from 'payload'
import { anyone, nobody } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'

/**
 * Addresses that used to be a page or an article. They let the not-found page say "removed"
 * instead of "can't find" (spec US5, research R6). Only server hooks write them.
 */
export const RemovedPaths: CollectionConfig = {
  slug: 'removed-paths',
  labels: { singular: 'Removed address', plural: 'Removed addresses' },
  admin: { group: 'Content', hidden: true, useAsTitle: 'path' },
  access: { read: anyone, create: nobody, update: nobody, delete: nobody },
  hooks: {
    afterChange: [revalidateTagAfterChange('removed-paths')],
    afterDelete: [revalidateTagAfterDelete('removed-paths')],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Page', value: 'page' },
        { label: 'Article', value: 'article' },
      ],
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'English', value: 'en' },
        { label: 'Arabic', value: 'ar' },
      ],
    },
    { name: 'path', type: 'text', required: true, index: true, admin: { description: 'Without the language prefix, e.g. /studios.' } },
    { name: 'removedAt', type: 'date', required: true },
  ],
}
