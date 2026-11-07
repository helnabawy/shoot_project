import type { CollectionConfig } from 'payload'
import { anyone, isEditor } from '@/shared/payload/access'
import { glyphField } from '@/shared/payload/fields/glyph'
import { slugField, validateSlug } from '@/shared/payload/fields/slug'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { refuseDeleteWhileReferenced } from '@/modules/personas/collections/guards'

export const OptionSets: CollectionConfig = {
  slug: 'option-sets',
  labels: { singular: 'Option set', plural: 'Option sets' },
  admin: {
    group: 'Brief builder',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    description:
      'The words visitors pick in the brief sentence (occasions, durations, emirates…). Leave "Personas" empty for options that apply to everyone.',
  },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isEditor },
  hooks: {
    afterChange: [revalidateTagAfterChange('option-sets')],
    afterDelete: [revalidateTagAfterDelete('option-sets')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const landing = await req.payload.findGlobal({ slug: 'landing-page', depth: 0, req })
        const used = (landing.briefBuilder?.slots ?? []).some(
          (s) => s.optionSet && String(typeof s.optionSet === 'object' ? s.optionSet.id : s.optionSet) === String(id),
        )
        return used ? ['the brief builder on the Landing Page'] : []
      }),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    slugField(),
    {
      name: 'options',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Option', plural: 'Options' },
      admin: { initCollapsed: false, components: {} },
      validate: (rows: unknown) => {
        const values = ((rows as { value?: string }[] | null) ?? []).map((r) => r.value)
        const dupes = values.filter((v, i) => v && values.indexOf(v) !== i)
        return dupes.length ? `Each option needs a unique value (repeated: ${[...new Set(dupes)].join(', ')}).` : true
      },
      fields: [
        { type: 'row', fields: [
          { name: 'label', type: 'text', required: true, localized: true, admin: { width: '45%' } },
          {
            name: 'value',
            type: 'text',
            required: true,
            validate: validateSlug,
            admin: { width: '35%', description: 'Stable id saved with each brief. Do not change after launch.' },
          },
          { ...glyphField(), admin: { width: '20%' } },
        ] },
        { type: 'row', fields: [
          { name: 'order', type: 'number', defaultValue: 100, admin: { width: '25%' } },
          { name: 'active', type: 'checkbox', defaultValue: true, admin: { width: '25%' } },
          {
            name: 'personas',
            type: 'relationship',
            relationTo: 'personas',
            hasMany: true,
            admin: { width: '50%', description: 'Empty = every persona.' },
          },
        ] },
      ],
    },
  ],
}
