import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createGuide, guidesWorld, NOW, type GuidesWorld } from './setup/pages'

class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFound()
  },
  permanentRedirect: () => {
    throw new NotFound()
  },
}))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }), headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }))
vi.mock('next-intl/server', () => import('../setup/server-intl'))

const guides = await import('@/modules/guides')
const listing = await import('@/app/(site)/[locale]/guides/page')
const article = await import('@/app/(site)/[locale]/guides/[slug]/page')
const feed = await import('@/app/(site)/[locale]/guides/feed/route')

describe('MP-US3-S2 scheduled guides', () => {
  let world: GuidesWorld
  const before = NOW
  const after = new Date('2026-11-07T12:01:30Z')
  beforeAll(async () => {
    world = await guidesWorld()
    await createGuide(world, { slug: 'live-guide', title: 'Live guide' })
    await createGuide(world, { slug: 'scheduled-guide', title: 'Scheduled guide', publishedAt: '2026-11-07T12:01:00.000Z' })
    await createGuide(world, { slug: 'draft-guide', title: 'Draft guide', _status: 'draft', publishedAt: '2026-01-01T00:00:00.000Z' })
  })

  const everywhere = async (now: Date) => {
    const list = await guides.listArticles({ locale: 'en', page: 1, now })
    const page = await guides.getArticle('scheduled-guide', 'en', { now })
    const items = await guides.getFeedItems('en', now)
    const map = await guides.listGuidesForSitemap(now)
    const api = await world.payload.find({ collection: 'articles', overrideAccess: false, depth: 0, context: { now } })
    return { list: list.items.map((i) => i.slug), page: page?.article.slug ?? null, feed: items.map((i) => i.link.split('/').pop()), sitemap: map.articles.map((a) => a.slug), api: api.docs.map((d) => d.slug) }
  }

  it('MP-US3-S2 a guide scheduled for later is absent from the listing, the page, the feed, the sitemap and the API', async () => {
    expect(await everywhere(before)).toEqual({ list: ['live-guide'], page: null, feed: ['live-guide'], sitemap: ['live-guide'], api: ['live-guide'] })
  })

  it('MP-US3-S2 once its time has come it is in all of them, without anyone publishing again', async () => {
    const now = await everywhere(after)
    expect(now.page).toBe('scheduled-guide')
    for (const where of [now.list, now.feed, now.sitemap, now.api]) expect(where.sort()).toEqual(['live-guide', 'scheduled-guide'])
  })

  it('MP-US3-S2 a draft is never public, whatever its date', async () => {
    expect(await guides.getArticle('draft-guide', 'en', { now: after })).toBeNull()
    expect((await guides.listArticles({ locale: 'en', page: 1, now: after })).items.map((i) => i.slug)).not.toContain('draft-guide')
  })

  it('MP-FR-016 a guide in preview shows even before its time, but only for an editor in draft mode', async () => {
    expect(await guides.getArticle('scheduled-guide', 'en', { now: before, draft: true })).toMatchObject({ article: { slug: 'scheduled-guide' } })
    expect(await guides.getArticle('draft-guide', 'en', { now: before, draft: true })).toMatchObject({ article: { slug: 'draft-guide' } })
  })

  it('MP-FR-016 the pages that depend on the clock are rebuilt at least every minute', () => {
    expect(listing.revalidate).toBe(60)
    expect(article.revalidate).toBe(60)
    expect(feed.revalidate).toBe(60)
  })

  it('MP-US3-S2 an unknown or not-yet-live guide is the site’s not-found page', async () => {
    await expect(article.default({ params: Promise.resolve({ locale: 'en', slug: 'nope' }) })).rejects.toBeInstanceOf(NotFound)
  })
})
