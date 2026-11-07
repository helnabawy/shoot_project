import { LEGAL_KINDS } from '@shoot/domain/pages'
import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditor } from '@/shared/payload/access'
import { LEGAL_PATH_PREVIEW } from '../paths'
import { afterLegalChange, filterDraftVersions, guardLegalVersions, prepareLegalVersions } from '../hooks'

const KIND_LABELS: Record<(typeof LEGAL_KINDS)[number], string> = {
  terms: 'Terms & Conditions',
  'professional-terms': 'Professional Terms',
  privacy: 'Privacy Policy',
}

export const LegalDocuments: CollectionConfig = {
  slug: 'legal-documents',
  labels: { singular: 'Legal document', plural: 'Legal documents' },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'updatedAt'],
    description:
      'Terms, Professional Terms and Privacy Policy. Add a new version instead of editing a published one: earlier versions stay readable for the record.',
    preview: (doc, { locale }) =>
      `/next/preview?secret=${process.env.PREVIEW_SECRET ?? ''}&path=${encodeURIComponent(LEGAL_PATH_PREVIEW(doc as { kind?: string }, locale))}`,
  },
  access: { read: anyone, create: isAdmin, update: isEditor, delete: isAdmin },
  hooks: {
    beforeValidate: [prepareLegalVersions],
    beforeChange: [guardLegalVersions],
    afterRead: [filterDraftVersions],
    afterChange: [afterLegalChange],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      unique: true,
      options: LEGAL_KINDS.map((value) => ({ label: KIND_LABELS[value], value })),
      admin: { position: 'sidebar', description: 'Fixed once created.' },
    },
    { name: 'title', type: 'text', required: true, localized: true, maxLength: 90 },
    {
      name: 'versions',
      type: 'array',
      maxRows: 50,
      admin: {
        description:
          'Add a version, write it, then set it to Published. A published version cannot be edited or removed; add a newer one instead. It applies from its effective date.',
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'version', type: 'number', admin: { readOnly: true, description: 'Assigned automatically.' } },
            { name: 'effectiveFrom', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Applies from this moment. Empty means the moment it is published.' } },
            {
              name: 'state',
              type: 'select',
              defaultValue: 'draft',
              required: true,
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
              ],
            },
          ],
        },
        {
          name: 'placeholder',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Tick while the text is a stand-in. A placeholder cannot be published.' },
        },
        { name: 'changeSummary', type: 'textarea', localized: true, admin: { description: 'What changed, in a sentence. Shown in the list of versions.' } },
        { name: 'body', type: 'richText', localized: true },
        { type: 'row', fields: [
          { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
          { name: 'publishedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
        ] },
      ],
    },
  ],
}
