import { beforeAll, describe, expect, it } from 'vitest'
import { createGuide, guidesWorld, NOW, translateGuide, lexical, type GuidesWorld } from './setup/pages'

const guides = await import('@/modules/guides')

describe('MP-US3 guides listing', () => {
  let world: GuidesWorld
  beforeAll(async () => {
    world = await guidesWorld()
    // 30 live guides, one a day, the newest first; every third is a corporate one
    for (let n = 1; n <= 30; n += 1) {
      await createGuide(world, {
        slug: `guide-${String(n).padStart(2, '0')}`,
        title: `Guide ${n}`,
        publishedAt: new Date(Date.UTC(2026, 9, n)).toISOString(),
        categories: [n % 3 === 0 ? world.categories.corporate.id : world.categories.wedding.id],
      })
    }
  }, 180_000)

  it('MP-US3-S1 pages hold twelve, newest first, with neighbours', async () => {
    const first = await guides.listArticles({ locale: 'en', page: 1, now: NOW })
    expect(first.items.map((i) => i.slug)[0]).toBe('guide-30')
    expect(first.items).toHaveLength(12)
    expect(first.pagination).toMatchObject({ page: 1, pages: 3, hasPrev: false, hasNext: true })
    const third = await guides.listArticles({ locale: 'en', page: 3, now: NOW })
    expect(third.items).toHaveLength(6)
    expect(third.items.at(-1)?.slug).toBe('guide-01')
    expect(third.pagination).toMatchObject({ hasPrev: true, hasNext: false })
  })

  it('MP-US3-S1 a page that does not exist is clamped and carries no items (the route redirects)', async () => {
    const far = await guides.listArticles({ locale: 'en', page: 99, now: NOW })
    expect(far.pagination.page).toBe(3)
    expect(far.items).toEqual([])
  })

  it('MP-US3-S1 a category lists only its own guides, and only categories with a live guide are offered', async () => {
    const corporate = await guides.listArticles({ locale: 'en', page: 1, category: 'corporate', now: NOW })
    expect(corporate.total).toBe(10)
    expect(corporate.items.every((i) => i.categories.some((c) => c.slug === 'corporate'))).toBe(true)
    const empty = await world.payload.create({ collection: 'article-categories', data: { slug: 'empty', name: 'Empty' } as never, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
    const categories = await guides.listCategories('en', NOW)
    expect(categories.map((c) => [c.slug, c.count])).toEqual([['corporate', 10], ['weddings', 20]])
    expect(categories.some((c) => c.slug === 'empty')).toBe(false)
    await world.payload.delete({ collection: 'article-categories', id: empty.id, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
  })

  it('MP-US3-S6 an author page exists only for an author with a live guide', async () => {
    expect(await guides.getAuthor('sara', 'en', NOW)).toMatchObject({ name: 'Sara Khan', count: 30, bio: 'Writes about shoots.' })
    const idle = await world.payload.create({ collection: 'authors', data: { slug: 'idle', name: 'Idle' } as never, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
    expect(await guides.getAuthor('idle', 'en', NOW)).toBeNull()
    expect(await guides.getAuthor('nobody', 'en', NOW)).toBeNull()
    await world.payload.delete({ collection: 'authors', id: idle.id, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
    const byAuthor = await guides.listArticles({ locale: 'en', page: 1, author: 'sara', now: NOW })
    expect(byAuthor.total).toBe(30)
  })

  it('MP-US3-S3 a guide comes with author, reading time, cover and up to three related guides in its category', async () => {
    const page = await guides.getArticle('guide-29', 'en', { now: NOW })
    expect(page?.article).toMatchObject({ title: 'Guide 29', readingMinutes: 1, author: { slug: 'sara', name: 'Sara Khan' }, categories: [{ slug: 'weddings', name: 'Weddings' }] })
    expect(page?.article.cover?.alt).toBe('A cover')
    expect(page?.related.map((r) => r.slug)).toEqual(['guide-28', 'guide-26', 'guide-25'])
    expect(page?.related.map((r) => r.slug)).not.toContain('guide-29')
  })

  it('MP-US3-S5 falls back to English, marked, and knows which language has words of its own', async () => {
    const guide = (await world.payload.find({ collection: 'articles', where: { slug: { equals: 'guide-30' } }, limit: 1, depth: 0 })).docs[0]!
    await translateGuide(world, guide.id, { title: 'دليل ٣٠', summary: 'ملخص', body: lexical('نص عربي') })
    const ar = await guides.listArticles({ locale: 'ar', page: 1, now: NOW })
    expect(ar.items[0]).toMatchObject({ slug: 'guide-30', title: 'دليل ٣٠', translated: true })
    expect(ar.items[1]).toMatchObject({ slug: 'guide-29', title: 'Guide 29', translated: false })
    expect((await guides.listArticles({ locale: 'en', page: 1, now: NOW })).items.every((i) => i.translated)).toBe(true)
    expect((await guides.getArticle('guide-30', 'ar', { now: NOW }))?.nativeIn).toEqual({ en: true, ar: true })
    expect((await guides.getArticle('guide-29', 'ar', { now: NOW }))?.nativeIn).toEqual({ en: true, ar: false })
  })
})
