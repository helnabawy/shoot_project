import type { CollectionConfig } from 'payload'
import { anyone, isEditor } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isEditor },
  admin: { group: 'Content', description: 'Images used on the site. Alternative text is required in English.' },
  hooks: { afterChange: [revalidateTagAfterChange('media')], afterDelete: [revalidateTagAfterDelete('media')] },
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'card', width: 800, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1600, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Describe the image for people who cannot see it. Use "" only for decoration.' },
    },
  ],
}
