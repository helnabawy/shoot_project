import { articleSummaryV1, articleV1, guideListV1 } from '@shoot/domain/api/v1'
import { paginateArticles } from '@shoot/domain/pages'
import { describe, expect, it } from 'vitest'
import type { Media } from '@/payload-types'
import { toWireImage, toWireRichText } from '@/shared/api/wire'
import type { ArticlePage, ArticleSummary } from './queries'
import { toWireArticle, toWireArticleSummary, toWireGuideList } from './wire'

const base = 'https://shoot.example'
const ctx = { locale: 'ar' as const, base }

const media: Media = {
  id: 7,
  alt: 'A couple at sunset',
  url: '/api/media/file/cover.jpg',
  width: 1600,
  height: 900,
  updatedAt: '',
  createdAt: '',
  sizes: { card: { url: '/api/media/file/cover-800.webp', width: 800, height: 450 } },
}

const summary = (over: Partial<ArticleSummary> = {}): ArticleSummary => ({
  id: '1',
  slug: 'brief-a-wedding-photographer',
  title: 'How to brief a wedding photographer',
  summary: 'What to say before the day.',
  publishedAt: '2026-10-01T00:00:00.000Z',
  translated: true,
  cover: { url: '/api/media/file/cover-800.webp', alt: 'A couple at sunset', width: 800, height: 450 },
  coverMedia: media,
  readingMinutes: 4,
  author: { slug: 'sara', name: 'Sara Khan' },
  categories: [{ slug: 'weddings', name: 'Weddings' }],
  ...over,
})

const body = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Start with the day', format: 0 }] },
      { type: 'paragraph', children: [{ type: 'link', fields: { url: '/ar/creators' }, children: [{ type: 'text', text: 'creators', format: 0 }] }] },
    ],
  },
}

describe('toWireArticleSummary', () => {
  it('MR-US4-S1 sends the cover through toWireImage with every size, and no internal field', () => {
    const wire = articleSummaryV1.parse(toWireArticleSummary(summary(), ctx))
    expect(wire.cover).toEqual(toWireImage(media, base))
    expect(wire.cover?.sizes.map((s) => s.width)).toEqual([800, 1600])
    expect(wire).not.toHaveProperty('id')
    expect(wire).toMatchObject({ readingMinutes: 4, author: { slug: 'sara', name: 'Sara Khan' }, categories: [{ slug: 'weddings', name: 'Weddings' }] })
  })

  it('falls back to the single-size cover, and null without one', () => {
    expect(toWireArticleSummary(summary({ coverMedia: null }), ctx).cover?.sizes).toHaveLength(1)
    expect(toWireArticleSummary(summary({ coverMedia: null, cover: null }), ctx).cover).toBeNull()
  })

  it('MR-US4-S3 inRequestedLanguage comes from the query', () => {
    expect(toWireArticleSummary(summary({ translated: false }), ctx).inRequestedLanguage).toBe(false)
    expect(toWireArticleSummary(summary({ translated: true }), ctx).inRequestedLanguage).toBe(true)
  })
})

describe('toWireArticle', () => {
  it('MR-US4-S2 sends the body through toWireRichText and maps the related guides', () => {
    const page = {
      article: { ...summary(), body, updatedAt: '', seo: null, ogImage: null },
      related: [summary({ id: '2', slug: 'plan-a-shoot-day', title: 'How to plan a shoot day' })],
      nativeIn: { en: true, ar: true },
    } as unknown as ArticlePage
    const wire = articleV1.parse(toWireArticle(page, ctx))
    expect(wire.body).toEqual(toWireRichText(body, base))
    expect(JSON.stringify(wire.body)).toContain('"href":"/creators"')
    expect(wire.related.map((r) => r.slug)).toEqual(['plan-a-shoot-day'])
  })
})

describe('toWireGuideList', () => {
  const categories = [{ slug: 'weddings', name: 'Weddings', description: null, count: 1 }]

  it('MR-US4-S1 maps the list, its pagination and the category it is narrowed to', () => {
    const wire = guideListV1.parse(
      toWireGuideList({ list: { items: [summary()], pagination: paginateArticles(13, 2), total: 13 }, categories, category: categories[0] ?? null, author: null }, ctx),
    )
    expect(wire.locale).toBe('ar')
    expect(wire.pagination).toEqual({ page: 2, pageCount: 2, total: 13, pageSize: 12 })
    expect(wire.category).toEqual({ slug: 'weddings', name: 'Weddings', description: null })
    expect(wire.author).toBeNull()
  })

  it('MR-US4-S1 fills the author with a photo, and answers an empty list with no pages', () => {
    const author = { slug: 'sara', name: 'Sara Khan', bio: 'Writes about shoots.', photo: null, photoMedia: media, count: 1 }
    const wire = guideListV1.parse(toWireGuideList({ list: { items: [], pagination: paginateArticles(0, 1), total: 0 }, categories: [], category: null, author }, ctx))
    expect(wire.author).toMatchObject({ slug: 'sara', bio: 'Writes about shoots.', photo: { alt: 'A couple at sunset' } })
    expect(wire.pagination).toEqual({ page: 1, pageCount: 0, total: 0, pageSize: 12 })
  })
})
