import type { Access, CollectionConfig } from 'payload'
import { validatePageSlug } from '@shoot/domain/pages'
import { hasRole, isEditor } from '@/shared/payload/access'
import { landingBlocks } from '@/modules/landing/blocks'
import {
  afterPageChange,
  afterPageDelete,
  beforePageDelete,
  preparePage,
  stampAndTrackSlugs,
} from '../hooks'
import { pageError } from '../messages'

/** Visitors read only the published version; editors also read drafts (FR-002). */
const readPublished: Access = ({ req }) => (hasRole(req.user as never, 'admin', 'editor') ? true : { _status: { equals: 'published' } })

/** Where the editor's Preview button goes: the public address in that language. */
export const previewPath = (doc: { kind?: string | null; slug?: string | null } | null | undefined, locale: string): string => {
  const base = doc?.kind === 'intent' ? '/hire' : ''
  const path = doc?.slug ? `${base}/${doc.slug}` : '/'
  return locale === 'ar' ? `/ar${path === '/' ? '' : path}` : path
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'kind', '_status', 'updatedAt'],
    description: 'Studios, About and any other page, built from the same sections as the home page. Intent pages open the brief for one kind of job.',
    preview: (doc, { locale }) =>
      `/next/preview?secret=${process.env.PREVIEW_SECRET ?? ''}&path=${encodeURIComponent(previewPath(doc as never, locale))}`,
  },
  access: { read: readPublished, create: isEditor, update: isEditor, delete: isEditor, readVersions: isEditor },
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: {
    beforeValidate: [preparePage],
    beforeChange: [stampAndTrackSlugs],
    afterChange: [afterPageChange],
    beforeDelete: [beforePageDelete],
    afterDelete: [afterPageDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'title', type: 'text', required: true, localized: true, maxLength: 90, admin: { description: 'The page heading.' } },
            {
              name: 'slug',
              type: 'text',
              localized: true,
              maxLength: 80,
              index: true,
              validate: (value: unknown, { data }: { data?: { kind?: string } }) => {
                if (!value) return true
                const error = validatePageSlug(String(value))
                // Intent pages live under /hire, so site words like "guides" are fine there.
                if (!error || (error === 'pages.slug.reserved' && data?.kind === 'intent')) return true
                return pageError(error)
              },
              admin: {
                position: 'sidebar',
                description: 'The address, e.g. "studios" for /studios. One per language; Arabic may stay empty to reuse the English one. If you change it, the old address keeps working.',
              },
            },
            {
              name: 'kind',
              type: 'select',
              defaultValue: 'standard',
              required: true,
              options: [
                { label: 'Page (at /address)', value: 'standard' },
                { label: 'Intent page (at /hire/address)', value: 'intent' },
              ],
              admin: { position: 'sidebar', description: 'Cannot be changed once the page has been published.' },
            },
            { name: 'sections', type: 'blocks', blocks: landingBlocks },
          ],
        },
        {
          label: 'Intent page',
          name: 'intent',
          admin: { condition: (data) => data?.kind === 'intent', description: 'What this page is about. The brief on the page starts with these answers; visitors can change them.' },
          fields: [
            { name: 'persona', type: 'relationship', relationTo: 'personas', admin: { description: 'Which kind of professional. It must be one the site offers.' } },
            { name: 'specialty', type: 'relationship', relationTo: 'categories', admin: { description: 'The kind of job, e.g. a proposal.' } },
            { name: 'location', type: 'relationship', relationTo: 'locations', admin: { description: 'An emirate or a city.' } },
            {
              name: 'presets',
              type: 'array',
              maxRows: 6,
              admin: { description: 'Answers for other steps of the brief: the step (token) and the value of one of its options.' },
              fields: [
                { type: 'row', fields: [
                  { name: 'token', type: 'text', required: true },
                  { name: 'value', type: 'text', required: true },
                ] },
              ],
            },
            { name: 'intro', type: 'textarea', localized: true, maxLength: 400, admin: { description: 'One short paragraph above the brief. Write it for this page: do not repeat another intent page.' } },
            { name: 'serviceName', type: 'text', localized: true, maxLength: 90, admin: { description: 'For search results. The page title is used when empty.' } },
            { name: 'areaServed', type: 'text', localized: true, maxLength: 60, admin: { description: 'For search results, e.g. "Dubai". The location name is used when empty.' } },
            {
              name: 'faq',
              type: 'array',
              maxRows: 12,
              admin: { description: 'Real questions with real answers. They appear on the page and in search results.' },
              fields: [
                { name: 'question', type: 'text', required: true, localized: true },
                { name: 'answer', type: 'richText', required: true, localized: true },
              ],
            },
            {
              name: 'similar',
              type: 'ui',
              admin: { components: { Field: '/modules/pages/components/SimilarPages#SimilarPages' } },
            },
          ],
        },
        {
          label: 'Navigation',
          name: 'placement',
          fields: [
            { name: 'inHeader', type: 'checkbox', defaultValue: false, admin: { description: 'Show in the header (up to 3 pages).' } },
            {
              name: 'footerGroup',
              type: 'text',
              admin: { description: 'The key of a footer group from Site settings → Footer (for example "company"). Leave empty to keep it out of the footer.' },
            },
            { name: 'navLabel', type: 'text', localized: true, admin: { description: 'Shorter text for the link. The title is used when empty.' } },
            { name: 'order', type: 'number', defaultValue: 100, admin: { description: 'Lower numbers come first.' } },
          ],
        },
        {
          label: 'Search & sharing',
          name: 'seo',
          fields: [
            { name: 'title', type: 'text', localized: true, maxLength: 60 },
            { name: 'description', type: 'textarea', localized: true, maxLength: 160 },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
            { name: 'hideFromSearch', type: 'checkbox', defaultValue: false, admin: { description: 'Keep this page out of search engines and the sitemap.' } },
          ],
        },
      ],
    },
    {
      name: 'previousSlugs',
      type: 'array',
      maxRows: 20,
      admin: { position: 'sidebar', readOnly: true, description: 'Earlier addresses; they redirect here. Kept automatically.' },
      fields: [
        { name: 'locale', type: 'select', required: true, options: ['en', 'ar'].map((v) => ({ label: v, value: v })) },
        { name: 'slug', type: 'text', required: true },
      ],
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'publishedBy', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar', readOnly: true } },
  ],
}
