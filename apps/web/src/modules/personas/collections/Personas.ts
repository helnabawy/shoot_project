import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '@/shared/payload/access'
import { glyphField } from '@/shared/payload/fields/glyph'
import { slugField } from '@/shared/payload/fields/slug'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { refuseDeleteWhileReferenced } from './guards'

export const Personas: CollectionConfig = {
  slug: 'personas',
  labels: { singular: 'Persona', plural: 'Personas' },
  admin: {
    group: 'Audience',
    useAsTitle: 'singular',
    defaultColumns: ['singular', 'slug', 'active', 'order'],
    components: { beforeList: ['/modules/admin/components/PersonasNote#PersonasNote'] },
    description:
      'Kinds of professional the site offers (Photographer, Videographer, Teacher…). Choose which are shown in Site Settings → Active personas.',
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateTagAfterChange('personas')],
    afterDelete: [revalidateTagAfterDelete('personas')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const found: string[] = []
        const users = await req.payload.count({ collection: 'users', where: { persona: { equals: id } }, req })
        if (users.totalDocs) found.push(`${users.totalDocs} account(s)`)
        const categories = await req.payload.count({ collection: 'categories', where: { personas: { in: [id] } }, req })
        if (categories.totalDocs) found.push(`${categories.totalDocs} categor${categories.totalDocs === 1 ? 'y' : 'ies'}`)
        const options = await req.payload.count({ collection: 'option-sets', where: { 'options.personas': { in: [id] } }, req })
        if (options.totalDocs) found.push(`${options.totalDocs} option set(s)`)
        // Briefs keep the professional types they were sent with (FR-063).
        const briefs = await req.payload.count({ collection: 'briefs', where: { persona: { in: [id] } }, req })
        if (briefs.totalDocs) found.push(`${briefs.totalDocs} brief(s)`)
        const settings = await req.payload.findGlobal({ slug: 'site-settings', depth: 0, req })
        const active = (settings.activePersonas ?? []).map((p) => (typeof p === 'object' ? p.id : p))
        if (active.map(String).includes(String(id))) found.push('Site Settings → Active personas')
        return found
      }),
    ],
  },
  fields: [
    { name: 'singular', type: 'text', required: true, localized: true, minLength: 2, maxLength: 40 },
    { name: 'plural', type: 'text', required: true, localized: true, maxLength: 60 },
    slugField(),
    { name: 'description', type: 'textarea', localized: true, maxLength: 300 },
    glyphField(),
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    {
      name: 'copy',
      type: 'group',
      admin: { description: 'You can use {persona.singular} and {persona.plural} in these texts.' },
      fields: [
        { name: 'seekerCta', type: 'text', localized: true },
        { name: 'providerCta', type: 'text', localized: true },
        { name: 'providerPitch', type: 'textarea', localized: true },
      ],
    },
  ],
}
