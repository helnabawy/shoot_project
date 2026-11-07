import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '@/shared/payload/access'
import { glyphField } from '@/shared/payload/fields/glyph'
import { slugField } from '@/shared/payload/fields/slug'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { countProfileReferences } from '@/modules/creators/references'
import { refuseDeleteWhileReferenced } from './guards'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Specialty', plural: 'Specialties' },
  admin: { group: 'Audience', useAsTitle: 'name', defaultColumns: ['name', 'slug', 'active', 'order'] },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateTagAfterChange('categories')],
    afterDelete: [revalidateTagAfterDelete('categories')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const users = await req.payload.count({ collection: 'users', where: { categories: { in: [id] } }, req })
        const found = users.totalDocs ? [`${users.totalDocs} account(s)`] : []
        const profiles = await countProfileReferences(req, { or: [{ specialties: { in: [id] } }, { 'samples.category': { equals: id } }] })
        if (profiles) found.push(`${profiles} creator profile(s)`)
        return found
      }),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'description', type: 'textarea', localized: true },
    glyphField(),
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'seo',
      type: 'group',
      admin: { description: 'Title, description and introduction of this specialty’s public page (/work/…).' },
      fields: [
        { name: 'title', type: 'text', localized: true, maxLength: 70 },
        { name: 'description', type: 'textarea', localized: true, maxLength: 160 },
        { name: 'intro', type: 'textarea', localized: true },
      ],
    },
    { name: 'personas', type: 'relationship', relationTo: 'personas', hasMany: true, required: true, minRows: 1 },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
