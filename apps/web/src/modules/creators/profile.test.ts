import { describe, expect, it } from 'vitest'
import type { Lookups } from './describe'
import { buildProfileView, hostLabel, languageName, type RawProfileDoc } from './profile'

const lookups: Lookups = {
  personas: new Map([['1', 'Photographer'], ['2', 'Videographer']]),
  specialties: new Map([['10', 'Portrait'], ['11', 'Events']]),
  locations: new Map([['100', 'Dubai Marina'], ['101', 'Abu Dhabi']]),
}
const media = (n: number, over: object = {}) =>
  ({ id: n, alt: `Alt ${n}`, url: `/api/media/file/${n}.png`, width: 1200, height: 900, sizes: { card: { url: `/c${n}.webp`, width: 800, height: 600 }, hero: { url: `/h${n}.webp`, width: 1600, height: 1200 } }, ...over }) as never

const doc = (over: Partial<RawProfileDoc> = {}): RawProfileDoc => ({
  id: 1,
  code: '7K4Q2',
  displayName: 'Sara Khan',
  bio: 'Weddings and portraits.\nBased in Dubai.',
  personas: [1, { id: 2 }],
  specialties: [10, 11],
  cities: [100, 101],
  languages: ['en', 'ar'],
  photo: media(1),
  samples: [
    { id: 's1', kind: 'image', image: media(2), caption: 'First', category: 10 },
    { id: 's2', kind: 'video', image: media(3), videoUrl: 'https://www.youtube.com/watch?v=abc', caption: null, category: null },
  ],
  social: [{ id: 'x1', platform: 'instagram', url: 'https://instagram.com/sara' }],
  ...over,
})

describe('CP-US2-S1 profile view', () => {
  it('resolves names for the page language and keeps the bio\'s line breaks', () => {
    const v = buildProfileView(doc(), lookups, 'en')
    expect(v).toMatchObject({ name: 'Sara Khan', types: 'Photographer and Videographer', places: ['Dubai Marina', 'Abu Dhabi'], specialties: ['Portrait', 'Events'], languages: ['English', 'Arabic'] })
    expect(v.bio).toBe('Weddings and portraits.\nBased in Dubai.')
    expect(v.initials).toBe('SK')
  })

  it('names languages in Arabic for the Arabic page', () => {
    expect(buildProfileView(doc(), lookups, 'ar').languages).toEqual(['الإنجليزية', 'العربية'])
    expect(languageName('xx', 'en')).toBe('xx')
  })

  it('maps images to the card size for the grid and the largest for the viewer, with real alt text', () => {
    const [first] = buildProfileView(doc(), lookups, 'en').samples
    expect(first).toMatchObject({ kind: 'image', thumb: { url: '/c2.webp', width: 800, height: 600 }, large: { url: '/h2.webp', width: 1600, height: 1200 }, alt: 'Alt 2', caption: 'First', specialty: 'Portrait' })
  })

  it('falls back to the original file when a size is missing, and drops a sample with no usable image', () => {
    const v = buildProfileView(
      doc({ samples: [{ id: 'a', kind: 'image', image: media(5, { sizes: {} }) }, { id: 'b', kind: 'image', image: null }, { id: 'c', kind: 'image', image: 9 }] }),
      lookups,
      'en',
    )
    expect(v.samples).toHaveLength(1)
    expect(v.samples[0]).toMatchObject({ thumb: { url: '/api/media/file/5.png', width: 1200, height: 900 }, large: { url: '/api/media/file/5.png' } })
  })

  it('a video sample links out with its host named and keeps its poster', () => {
    const video = buildProfileView(doc(), lookups, 'en').samples[1]!
    expect(video).toMatchObject({ kind: 'video', videoUrl: 'https://www.youtube.com/watch?v=abc', provider: 'YouTube', thumb: { url: '/c3.webp' } })
    expect(video.caption).toBe('')
    expect(hostLabel('https://vimeo.com/123')).toBe('Vimeo')
    expect(hostLabel('https://youtu.be/abc')).toBe('YouTube')
    expect(hostLabel('https://example.com/x')).toBe('example.com')
    expect(hostLabel('not a url')).toBe('')
  })

  it('a video sample without a link is dropped', () => {
    expect(buildProfileView(doc({ samples: [{ id: 'v', kind: 'video', image: media(3), videoUrl: '' }] }), lookups, 'en').samples).toEqual([])
  })

  it('keeps social links in order and drops any that are not https', () => {
    const v = buildProfileView(doc({ social: [{ id: '1', platform: 'instagram', url: 'https://instagram.com/sara' }, { id: '2', platform: 'website', url: 'javascript:alert(1)' }] }), lookups, 'en')
    expect(v.social).toEqual([{ platform: 'instagram', url: 'https://instagram.com/sara' }])
  })

  it('copes with a bare profile: no bio, photo, samples, links or places', () => {
    const v = buildProfileView({ id: 2, code: 'ABCDE', displayName: 'Lina' }, lookups, 'en')
    expect(v).toMatchObject({ name: 'Lina', bio: '', photo: null, types: '', places: [], specialties: [], languages: [], samples: [], social: [] })
  })

  it('shares the first sample (the work), else the photo, else nothing', () => {
    expect(buildProfileView(doc({ photo: null }), lookups, 'en').shareImage?.url).toBe('/h2.webp')
    expect(buildProfileView(doc(), lookups, 'en').shareImage?.url).toBe('/h2.webp')
    expect(buildProfileView(doc({ samples: [] }), lookups, 'en').shareImage?.url).toBe('/h1.webp')
    expect(buildProfileView(doc({ photo: null, samples: [] }), lookups, 'en').shareImage).toBeNull()
  })
})
