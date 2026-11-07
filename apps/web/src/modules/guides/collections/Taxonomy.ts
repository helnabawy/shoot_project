import type { CollectionConfig } from 'payload'
import { refuseDeleteWhileReferenced } from '@/modules/personas/collections/guards'
import { anyone, isEditor } from '@/shared/payload/access'
import { slugField } from '@/shared/payload/fields/slug'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { articlesUsing } from '../references'

export const ArticleCategories: CollectionConfig = {
  slug: 'article-categories',
  labels: { singular: 'Guide category', plural: 'Guide categories' },
  admin: { group: 'Content', useAsTitle: 'name', description: 'Topics that group the guides. A category with no live guide is not shown on the site.' },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateTagAfterChange('article-categories')],
    afterDelete: [revalidateTagAfterDelete('article-categories')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const titles = await articlesUsing(req, { categories: { equals: id } })
        return titles.map((t) => `the guide "${t}"`)
      }),
    ],
  },
  fields: [
    slugField(),
    { name: 'name', type: 'text', required: true, localized: true, maxLength: 60 },
    { name: 'description', type: 'textarea', localized: true, maxLength: 240 },
  ],
}

export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: { singular: 'Author', plural: 'Authors' },
  admin: { group: 'Content', useAsTitle: 'name', description: 'The people guides are written by. Not necessarily accounts on the site.' },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateTagAfterChange('authors')],
    afterDelete: [revalidateTagAfterDelete('authors')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const titles = await articlesUsing(req, { author: { equals: id } })
        return titles.map((t) => `the guide "${t}"`)
      }),
    ],
  },
  fields: [
    slugField(),
    { name: 'name', type: 'text', required: true, localized: true, maxLength: 80 },
    { name: 'bio', type: 'textarea', localized: true, maxLength: 400 },
    { name: 'photo', type: 'upload', relationTo: 'media' },
  ],
}
