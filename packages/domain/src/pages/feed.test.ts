import { describe, expect, it } from 'vitest'
import { buildRss, FEED_ITEM_LIMIT, type Feed } from './feed'
import { articleJsonLd } from './structured-data'

const base: Feed = {
  title: 'Guides & tips',
  description: 'How to brief "a shoot"',
  link: 'https://shoot.example/guides',
  selfLink: 'https://shoot.example/guides/feed',
  language: 'en',
  items: [],
  now: new Date('2026-11-07T12:00:00Z'),
}
const item = (n: number, extra = {}) => ({ title: `Guide ${n}`, summary: `Summary ${n}`, link: `https://shoot.example/guides/g${n}`, publishedAt: new Date(Date.UTC(2026, 0, n)).toISOString(), ...extra })

describe('MP-US3-S4 buildRss', () => {
  it('describes the channel, links itself and uses the build time when empty', () => {
    const xml = buildRss(base)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<atom:link href="https://shoot.example/guides/feed" rel="self" type="application/rss+xml"/>')
    expect(xml).toContain('<title>Guides &amp; tips</title>')
    expect(xml).toContain('<description>How to brief &quot;a shoot&quot;</description>')
    expect(xml).toContain('<lastBuildDate>Sat, 07 Nov 2026 12:00:00 GMT</lastBuildDate>')
    expect(xml).not.toContain('<item>')
  })

  it('lists newest first with absolute links, dates and the author, and takes the newest date as the build date', () => {
    const xml = buildRss({ ...base, items: [item(1), item(3, { author: 'Sara <S>' }), item(2)] })
    expect(xml.indexOf('Guide 3')).toBeLessThan(xml.indexOf('Guide 2'))
    expect(xml.indexOf('Guide 2')).toBeLessThan(xml.indexOf('Guide 1'))
    expect(xml).toContain('<guid isPermaLink="true">https://shoot.example/guides/g3</guid>')
    expect(xml).toContain('<pubDate>Sat, 03 Jan 2026 00:00:00 GMT</pubDate>')
    expect(xml).toContain('<dc:creator>Sara &lt;S&gt;</dc:creator>')
    expect(xml).toContain('<lastBuildDate>Sat, 03 Jan 2026 00:00:00 GMT</lastBuildDate>')
  })

  it('escapes every text and keeps at most twenty items', () => {
    const items = Array.from({ length: 25 }, (_, i) => item(i + 1, i === 24 ? { title: "A&B <c> 'd'" } : {}))
    const xml = buildRss({ ...base, items })
    expect((xml.match(/<item>/g) ?? []).length).toBe(FEED_ITEM_LIMIT)
    expect(xml).toContain('A&amp;B &lt;c&gt; &apos;d&apos;')
  })
})

describe('MP-US3-S3 articleJsonLd', () => {
  it('describes the guide with its author and image', () => {
    expect(
      articleJsonLd({ headline: 'H', description: 'D', url: 'https://x/g', datePublished: '2026-01-01T00:00:00Z', dateModified: '2026-02-01T00:00:00Z', author: 'Sara', image: 'https://x/i.jpg', locale: 'ar' }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'H',
      description: 'D',
      mainEntityOfPage: 'https://x/g',
      datePublished: '2026-01-01T00:00:00Z',
      dateModified: '2026-02-01T00:00:00Z',
      author: { '@type': 'Person', name: 'Sara' },
      image: 'https://x/i.jpg',
      inLanguage: 'ar',
    })
  })
  it('leaves out what it does not have and modified falls back to published', () => {
    const ld = articleJsonLd({ headline: 'H', url: 'https://x/g', datePublished: '2026-01-01T00:00:00Z', locale: 'en' })
    expect(ld).not.toHaveProperty('author')
    expect(ld).not.toHaveProperty('image')
    expect(ld).not.toHaveProperty('description')
    expect(ld.dateModified).toBe('2026-01-01T00:00:00Z')
  })
})
