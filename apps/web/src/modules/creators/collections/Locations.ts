import type { CollectionConfig, RelationshipFieldSingleValidation } from 'payload'
import { refuseDeleteWhileReferenced } from '@/modules/personas/collections/guards'
import { anyone, isAdmin } from '@/shared/payload/access'
import { slugField } from '@/shared/payload/fields/slug'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { countProfileReferences, relId } from '../references'

/** A city's parent must be an emirate: one level only (research §9). */
const validateParent: RelationshipFieldSingleValidation = async (value, { req, id }) => {
  const parentId = relId(value)
  if (!parentId) return true
  if (id !== undefined && String(id) === parentId) return 'locations.parent.depth'
  const parent = await req.payload.findByID({ collection: 'locations', id: parentId, depth: 0, req, overrideAccess: true })
  return relId(parent.parent) ? 'locations.parent.depth' : true
}

/** Emirates (no parent) and their cities (one level), bilingual CMS data (research §9). */
export const Locations: CollectionConfig = {
  slug: 'locations',
  labels: { singular: 'Location', plural: 'Locations' },
  admin: {
    group: 'Audience',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent', 'active', 'order'],
    description: 'Emirates and cities creators work in. A location with a parent is a city; without one it is an emirate.',
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateTagAfterChange('locations')],
    afterDelete: [revalidateTagAfterDelete('locations')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const found: string[] = []
        const profiles = await countProfileReferences(req, { cities: { in: [id] } })
        if (profiles) found.push(`${profiles} creator profile(s)`)
        const children = await req.payload.count({ collection: 'locations', where: { parent: { equals: id } }, req })
        if (children.totalDocs) found.push(`${children.totalDocs} city location(s)`)
        return found
      }),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField(),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'locations',
      filterOptions: { parent: { exists: false } },
      validate: validateParent,
      admin: { description: 'Leave empty for an emirate. Choose an emirate to make this a city.' },
    },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
