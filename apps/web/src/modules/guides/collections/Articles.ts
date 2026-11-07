import type { Access, CollectionConfig, Where } from 'payload'
import { isEditor, isEditorUser } from '@/shared/payload/access'
import { slugField, validateSlug } from '@/shared/payload/fields/slug'
import { afterArticleChange, afterArticleDelete, beforeArticleDelete, prepareArticle, RESERVED_ARTICLE_SLUGS } from '../hooks'

/**
 * Visitors read live guides only: published and past their publication time. The clock comes from the
 * request context when a server query pins it (tests); REST callers cannot set it.
 */
const readLive: Access = ({ req }) => {
  if (isEditorUser(req.user)) return true
  const now = (req.context?.now instanceof Date ? req.context.now : new Date()).toISOString()
  const live: Where = { and: [{ _status: { equals: 'published' } }, { publishedAt: { less_than_equal: now } }] }
  return live
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Guide', plural: 'Guides' },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt', '_status'],
    description: 'Guides for clients. Set a publication time in the future to schedule one: it appears by itself.',
    preview: (doc, { locale }) =>
      `/next/preview?secret=${process.env.PREVIEW_SECRET ?? ''}&path=${encodeURIComponent(`${locale === 'ar' ? '/ar' : ''}/guides/${(doc as { slug?: string }).slug ?? ''}`)}`,
  },
  access: { read: readLive, create: isEditor, update: isEditor, delete: isEditor, readVersions: isEditor },
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: {
    beforeValidate: [prepareArticle],
    afterChange: [afterArticleChange],
    beforeDelete: [beforeArticleDelete],
    afterDelete: [afterArticleDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Guide',
          fields: [
            { name: 'title', type: 'text', required: true, localized: true, maxLength: 110 },
            { name: 'summary', type: 'textarea', required: true, localized: true, maxLength: 220, admin: { description: 'Shown in the list, the feed and search results.' } },
            { name: 'cover', type: 'upload', relationTo: 'media', required: true, admin: { description: 'The cover image. Its description is read out to people who cannot see it.' } },
            { name: 'body', type: 'richText', required: true, localized: true },
          ],
        },
        {
          label: 'Search & sharing',
          name: 'seo',
          fields: [
            { name: 'title', type: 'text', localized: true, maxLength: 60 },
            { name: 'description', type: 'textarea', localized: true, maxLength: 160 },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
            { name: 'hideFromSearch', type: 'checkbox', defaultValue: false },
          ],
        },
      ],
    },
    slugField({
      validate: (value: unknown) => {
        const ok = validateSlug(value)
        if (ok !== true) return ok
        return (RESERVED_ARTICLE_SLUGS as readonly string[]).includes(String(value)) ? 'This address is used by the guides pages themselves. Choose another.' : true
      },
    }),
    { name: 'author', type: 'relationship', relationTo: 'authors', required: true, admin: { position: 'sidebar' } },
    { name: 'categories', type: 'relationship', relationTo: 'article-categories', hasMany: true, required: true, admin: { position: 'sidebar' } },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' }, description: 'In the future means scheduled. Empty means now.' },
    },
  ],
}
