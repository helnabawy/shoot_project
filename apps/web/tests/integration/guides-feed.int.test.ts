import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createGuide, guidesWorld, lexical, NOW, translateGuide, type GuidesWorld } from './setup/pages'

vi.mock('next-intl/server', () => import('../setup/server-intl'))

const guides = await import('@/modules/guides')
const feed = await import('@/app/(site)/[locale]/guides/feed/route')

describe('MP-US3 the feed', () => {
  let world: GuidesWorld
  beforeAll(async () => {
    world = await guidesWorld()
    for (let n = 1; n <= 25; n += 1) {
      const guide = await createGuide(world, { slug: `guide-${n}`, title: `Guide ${n} & more`, publishedAt: new Date(Date.UTC(2026, 9, n)).toISOString() })
      if (n % 5 === 0) await translateGuide(world, guide.id, { title: `دليل ${n}`, summary: 'ملخص', body: lexical('نص') })
    }
  }, 180_000)

  it('MP-US3-S4 holds the twenty newest live guides, newest first, with absolute links and the author', async () => {
    const items = await guides.getFeedItems('en', NOW)
    expect(items).toHaveLength(20)
    expect(items[0]).toMatchObject({ title: 'Guide 25 & more', link: 'http://localhost:3000/guides/guide-25', author: 'Sara Khan' })
    expect(items.at(-1)?.link).toBe('http://localhost:3000/guides/guide-6')
  })

  it('MP-US3-S5 the Arabic feed lists only guides with Arabic text, at Arabic addresses', async () => {
    const items = await guides.getFeedItems('ar', NOW)
    expect(items.map((i) => i.title)).toEqual(['دليل 25', 'دليل 20', 'دليل 15', 'دليل 10', 'دليل 5'])
    expect(items[0]?.link).toBe('http://localhost:3000/ar/guides/guide-25')
  })

  it('MP-US3-S4 the route answers with well-formed RSS in the language of the address', async () => {
    const response = await feed.GET(new Request('http://localhost:3000/guides/feed'), { params: Promise.resolve({ locale: 'en' }) })
    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8')
    const xml = await response.text()
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect((xml.match(/<item>/g) ?? []).length).toBe(20)
    expect((xml.match(/<\/item>/g) ?? []).length).toBe(20)
    expect(xml).toContain('Guide 25 &amp; more')
    expect(xml).toContain('<language>en</language>')
    const ar = await (await feed.GET(new Request('http://localhost:3000/ar/guides/feed'), { params: Promise.resolve({ locale: 'ar' }) })).text()
    expect(ar).toContain('<language>ar</language>')
    expect((ar.match(/<item>/g) ?? []).length).toBe(5)
    expect((await feed.GET(new Request('http://localhost:3000/fr/guides/feed'), { params: Promise.resolve({ locale: 'fr' }) })).status).toBe(404)
  })
})
