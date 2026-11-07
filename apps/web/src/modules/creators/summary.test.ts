import { describe, expect, it } from 'vitest'
import { BIO_EXCERPT_LENGTH, excerpt, locationParents, publicSummaries, toSummary, type RawListing, type RawProfile } from './summary'

const parents = locationParents([
  { id: 1 },
  { id: 2 },
  { id: 3, parent: 2 },
  { id: 4, parent: { id: 1 } },
])
const listing = (over: Partial<RawListing> = {}): RawListing => ({ profile: 10, active: true, suspended: false, featured: false, verifiedAt: '2026-11-07T08:00:00.000Z', ...over })
const profile = (over: Partial<RawProfile> = {}): RawProfile => ({ id: 10, code: '7K4Q2', displayName: 'Sara', personas: [1], ...over })

describe('creator summary', () => {
  it('shortens a bio to an excerpt on one line', () => {
    expect(excerpt(null)).toBe('')
    expect(excerpt('  Short   bio\nhere ')).toBe('Short bio here')
    const long = excerpt('word '.repeat(100))
    expect(long.length).toBeLessThanOrEqual(BIO_EXCERPT_LENGTH)
    expect(long.endsWith('…')).toBe(true)
  })

  it('derives emirates from cities (a city counts for its parent, an emirate for itself)', () => {
    const s = toSummary(profile({ cities: [3, 4, 1, { id: 2 }] }), listing(), parents)
    expect(s.locationIds).toEqual(['3', '4', '1', '2'])
    expect(s.emirateIds.sort()).toEqual(['1', '2'])
  })

  it('maps relations, languages, featuring and the first publication date', () => {
    const s = toSummary(
      profile({ specialties: [5, { id: 6 }], languages: ['en', 'ar'], samples: [{ category: 5 }, { category: { id: 6 } }, {}], bio: 'Hello' }),
      listing({ featured: true }),
      parents,
      '2026-01-01',
    )
    expect(s).toMatchObject({
      id: '10', code: '7K4Q2', displayName: 'Sara', bio: 'Hello', personaIds: ['1'], specialtyIds: ['5', '6'],
      languages: ['en', 'ar'], sampleCounts: { '5': 1, '6': 1 }, sampleCount: 3, featured: true, publishedAt: '2026-11-07T08:00:00.000Z',
    })
    expect(toSummary(profile(), listing({ verifiedAt: null }), parents, '2026-01-01').publishedAt).toBe('2026-01-01')
  })

  it('uses the thumbnail, then the card size, then the original; none gives no photo', () => {
    const media = (over: object) => ({ id: 1, alt: 'Sara', ...over }) as never
    expect(toSummary(profile({ photo: media({ sizes: { thumbnail: { url: '/t.webp', width: 400, height: 300 } } }) }), listing(), parents).photo).toEqual({ url: '/t.webp', alt: 'Sara', width: 400, height: 300 })
    expect(toSummary(profile({ photo: media({ sizes: { card: { url: '/c.webp', width: 800, height: 600 } } }) }), listing(), parents).photo?.url).toBe('/c.webp')
    expect(toSummary(profile({ photo: media({ url: '/o.png', width: 10, height: 10 }) }), listing(), parents).photo?.url).toBe('/o.png')
    expect(toSummary(profile({ photo: media({}) }), listing(), parents).photo).toBeNull()
    expect(toSummary(profile({ photo: 5 }), listing(), parents).photo).toBeNull()
    expect(toSummary(profile(), listing(), parents).photo).toBeNull()
  })

  it('keeps only public creators: needs a listing, active and not suspended', () => {
    const all = publicSummaries(
      [profile({ id: 10 }), profile({ id: 11 }), profile({ id: 12 }), profile({ id: 13 })],
      [listing({ profile: 10 }), listing({ profile: 11, active: false }), listing({ profile: 12, suspended: true })],
      parents,
    )
    expect(all.map((s) => s.id)).toEqual(['10'])
  })

  it('stays small: 2 000 heavy summaries serialise under the 1.5 MB cache ceiling (research §3)', () => {
    const many = Array.from({ length: 2000 }, (_, i) =>
      toSummary(
        profile({
          id: 1000 + i,
          displayName: 'A Realistic Creator Name Here',
          bio: 'x'.repeat(600),
          personas: [1, 2],
          specialties: [10, 11, 12, 13, 14, 15],
          cities: [3, 4, 1],
          languages: ['en', 'ar', 'hi'],
          samples: Array.from({ length: 30 }, (_, n) => ({ category: 10 + (n % 6) })),
          photo: { id: 1, alt: 'A portrait of the creator', sizes: { thumbnail: { url: '/api/media/file/portrait-of-the-creator-400x300.webp', width: 400, height: 300 } } } as never,
        }),
        listing({ profile: 1000 + i }),
        parents,
      ),
    )
    expect(JSON.stringify(many).length).toBeLessThan(1.5 * 1024 * 1024)
  })
})
