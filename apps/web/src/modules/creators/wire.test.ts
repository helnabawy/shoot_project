import { creatorCardV1, creatorListV1, creatorProfileV1, specialtyPageV1 } from '@shoot/domain/api/v1'
import type { CreatorSummary } from '@shoot/domain/creators'
import { describe, expect, it } from 'vitest'
import type { Media } from '@/payload-types'
import { describeCreator, type Lookups } from './describe'
import { buildDirectory } from './directory'
import type { CreatorProfilePage, DirectoryContext, SpecialtyPage } from './queries'
import { toWireCreatorCard, toWireCreatorList, toWireCreatorProfile, toWireSpecialtyPage, upTo } from './wire'

const base = 'https://shoot.example'
const en = { locale: 'en' as const, base }

const lookups: Lookups = {
  personas: new Map([
    ['1', 'Photographer'],
    ['2', 'Videographer'],
  ]),
  specialties: new Map([
    ['11', 'Weddings'],
    ['12', 'Events'],
  ]),
  locations: new Map([
    ['30', 'Dubai'],
    ['31', 'Sharjah'],
  ]),
}

const context: DirectoryContext = {
  lookups,
  personas: [
    { id: '1', slug: 'photographer', name: 'Photographers' },
    { id: '2', slug: 'videographer', name: 'Videographers' },
  ],
  specialties: [
    { id: '11', slug: 'weddings', name: 'Weddings' },
    { id: '12', slug: 'events', name: 'Events' },
  ],
  emirates: [
    { id: '30', slug: 'dubai', name: 'Dubai' },
    { id: '31', slug: 'sharjah', name: 'Sharjah' },
  ],
  prefix: 'SH',
  pageSize: 2,
}

/** A summary carrying the internal fields that must never be sent. */
const creator = (id: string, over: Partial<CreatorSummary> = {}): CreatorSummary => ({
  id,
  code: `008${id}`,
  displayName: `Omar K${id}`,
  bio: 'bio',
  photo: { url: `/api/media/file/omar-${id}-400.webp`, alt: 'Omar', width: 400, height: 500 },
  personaIds: ['1', '2'],
  specialtyIds: ['11', '12'],
  locationIds: ['31', '30'],
  emirateIds: ['31', '30'],
  languages: ['ar', 'en'],
  sampleCounts: { '11': 3 },
  sampleCount: 3,
  featured: false,
  publishedAt: `2026-01-0${id}T00:00:00.000Z`,
  matchValues: ['male', 'tag'],
  yearsExperience: 6,
  ...over,
})

const media = (name: string, alt = name): Media => ({
  id: 1,
  alt,
  url: `/api/media/file/${name}.jpg`,
  width: 2400,
  height: 1600,
  uploadedBy: 9,
  updatedAt: '',
  createdAt: '',
  sizes: {
    thumbnail: { url: `/api/media/file/${name}-400.webp`, width: 400, height: 267 },
    card: { url: `/api/media/file/${name}-800.webp`, width: 800, height: 533 },
    hero: { url: `/api/media/file/${name}-1600.webp`, width: 1600, height: 1067 },
  },
})

const INTERNAL = ['matchValues', 'gender', 'personaIds', 'listing', 'suspended', 'active', 'accessSalt', 'uploadedBy', 'sampleCounts', 'publishedAt']

function keysOf(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, into))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      into.add(k)
      keysOf(v, into)
    }
  return into
}
const expectNoInternal = (value: unknown) => {
  const keys = keysOf(value)
  for (const k of INTERNAL) expect(keys.has(k), k).toBe(false)
}

describe('toWireCreatorCard', () => {
  it('MR-US3-S1 takes its words from describeCreator and never sends match values, gender, persona ids or listing state', () => {
    const c = creator('1', { featured: true })
    const card = creatorCardV1.parse(toWireCreatorCard(c, lookups, 'SH', en))
    const view = describeCreator(c, lookups, 'SH', 'en')
    expect(card).toMatchObject({ code: '0081', displayCode: view.displayCode, name: view.name, initials: view.initials, types: view.types, featured: true })
    expect(card.displayCode).toBe('SH-0081')
    expect(card.places).toEqual(['Sharjah', 'Dubai'])
    expect(card.languages).toEqual(['Arabic', 'English'])
    expectNoInternal(card)
  })

  it('MR-US3-S1 the photo goes through toWireImage: absolute, with its size', () => {
    const card = toWireCreatorCard(creator('1'), lookups, 'SH', en)
    expect(card.photo).toEqual({ alt: 'Omar', width: 400, height: 500, sizes: [{ url: `${base}/api/media/file/omar-1-400.webp`, width: 400, height: 500 }] })
    expect(toWireCreatorCard(creator('1', { photo: null }), lookups, 'SH', en).photo).toBeNull()
  })
})

describe('toWireCreatorList', () => {
  const creators = [creator('1'), creator('2', { featured: true }), creator('3', { personaIds: ['1'], specialtyIds: ['12'], locationIds: ['30'], emirateIds: ['30'] })]
  const labels = { type: 'Professional', specialty: 'Specialty', place: 'Emirate' }

  it('MR-US3-S1 keeps the website order (featured, then newest), filters with counts and pagination', () => {
    const view = buildDirectory({ creators, context, params: {}, locale: 'en' })
    const list = creatorListV1.parse(toWireCreatorList(view, context, labels, en))
    expect(list.items.map((c) => c.code)).toEqual(['0082', '0083'])
    expect(list.pagination).toEqual({ page: 1, pageCount: 2, total: 3, pageSize: 2 })
    expect(list.filters.map((f) => [f.key, f.label])).toEqual([
      ['type', 'Professional'],
      ['specialty', 'Specialty'],
      ['place', 'Emirate'],
    ])
    expect(list.filters[0]?.options).toEqual([
      { slug: 'photographer', name: 'Photographers', count: 3, selected: false },
      { slug: 'videographer', name: 'Videographers', count: 2, selected: false },
    ])
    expectNoInternal(list)
  })

  it('MR-US3-S1 a filter narrows, is marked selected, and a page past the end is the last page', () => {
    const view = buildDirectory({ creators, context, params: { specialty: 'events', page: '99' }, locale: 'en' })
    const list = toWireCreatorList(view, context, labels, en)
    expect(list.pagination).toEqual({ page: 2, pageCount: 2, total: 3, pageSize: 2 })
    expect(list.items.map((c) => c.code)).toEqual(['0081'])
    expect(list.filters.find((f) => f.key === 'specialty')?.options.find((o) => o.selected)?.slug).toBe('events')
  })

  it('an empty directory has no pages', () => {
    const view = buildDirectory({ creators: [], context, params: {}, locale: 'en' })
    expect(creatorListV1.parse(toWireCreatorList(view, context, labels, en)).pagination).toEqual({ page: 1, pageCount: 0, total: 0, pageSize: 2 })
  })
})

describe('toWireCreatorProfile', () => {
  const page = (): CreatorProfilePage => ({
    displayCode: 'SH-0087',
    canBook: true,
    personaSlugs: ['photographer'],
    view: {
      id: '7',
      code: '0087',
      name: 'Omar K.',
      initials: 'OK',
      bio: 'I shoot weddings.',
      photo: null,
      types: 'Photographer and videographer',
      places: ['Sharjah', 'Dubai'],
      specialties: ['Weddings'],
      languages: ['Arabic', 'English'],
      nationality: '',
      yearsExperience: 6,
      samples: [],
      social: [{ platform: 'Instagram', url: 'https://instagram.com/omar' }],
      shareImage: null,
    },
    doc: {
      id: 7,
      displayName: 'Omar K.',
      code: '0087',
      gender: 'male',
      photo: media('omar', 'Omar K.'),
      samples: [
        { id: 'a', kind: 'image', image: media('garden', 'Garden ceremony'), caption: 'Garden ceremony', category: 11 },
        { id: 'b', kind: 'video', image: media('film'), videoUrl: 'https://youtu.be/abc', category: 11 },
        { id: 'c', kind: 'video', image: media('broken') },
        { id: 'd', kind: 'image', image: 5 },
      ],
    } as unknown as CreatorProfilePage['doc'],
  })

  it('MR-US3-S2 sends the profile with every stored size and no gender', () => {
    const wire = creatorProfileV1.parse(toWireCreatorProfile(page(), lookups, en))
    expect(wire).toMatchObject({ code: '0087', displayCode: 'SH-0087', name: 'Omar K.', nationality: null, yearsExperience: 6, canBook: true, personaSlugs: ['photographer'] })
    expect(wire.photo?.sizes.map((s) => s.width)).toEqual([400, 800, 1600, 2400])
    expect(wire.social).toEqual([{ label: 'Instagram', url: 'https://instagram.com/omar' }])
    expectNoInternal(wire)
  })

  it('MR-US3-S2 samples: thumbs up to the card size, videos with their provider, bad rows dropped as on the website', () => {
    const wire = toWireCreatorProfile(page(), lookups, en)
    expect(wire.samples.map((s) => s.id)).toEqual(['a', 'b'])
    const [image, video] = wire.samples
    expect(image).toMatchObject({ kind: 'image', alt: 'Garden ceremony', caption: 'Garden ceremony', specialty: 'Weddings', videoUrl: null, provider: null })
    expect(image?.thumb.sizes.map((s) => s.width)).toEqual([400, 800])
    expect(image?.large.sizes.map((s) => s.width)).toEqual([400, 800, 1600, 2400])
    expect(video).toMatchObject({ kind: 'video', videoUrl: 'https://youtu.be/abc', provider: 'YouTube' })
  })

  it('keeps a nationality the view named', () => {
    const p = page()
    p.view.nationality = 'United Arab Emirates'
    expect(toWireCreatorProfile(p, lookups, en).nationality).toBe('United Arab Emirates')
  })
})

describe('toWireSpecialtyPage', () => {
  const page: SpecialtyPage = {
    category: { id: '11', slug: 'weddings', name: 'Weddings' },
    title: 'Wedding professionals',
    description: 'd',
    intro: 'i',
    counts: { samples: 24, pros: 12 },
    creators: [creator('2', { featured: true }), creator('1')],
    samples: [
      { id: '2-a', creatorId: '2', creatorName: 'Omar K2', code: '0082', thumb: { url: '/api/media/file/g-800.webp', width: 800, height: 533 }, alt: 'Garden', caption: 'Garden ceremony', kind: 'image', media: media('g', 'Garden') },
      { id: '1-b', creatorId: '1', creatorName: 'Omar K1', code: '0081', thumb: { url: '/api/media/file/h-800.webp', width: 800, height: 533 }, alt: 'Hall', caption: '', kind: 'image', media: null },
    ],
  }

  it('MR-US3-S3 sends the text, the counts, the cards and the samples with their creator code', () => {
    const wire = specialtyPageV1.parse(toWireSpecialtyPage(page, context, en))
    expect(wire.counts).toEqual({ samples: 24, professionals: 12 })
    expect(wire.creators.map((c) => c.code)).toEqual(['0082', '0081'])
    expect(wire.samples.map((s) => [s.id, s.creatorCode, s.creatorName])).toEqual([
      ['2-a', '0082', 'Omar K2'],
      ['1-b', '0081', 'Omar K1'],
    ])
    expect(wire.samples[0]?.thumb.sizes.map((s) => s.width)).toEqual([400, 800])
    expect(wire.samples[1]?.thumb).toEqual({ alt: 'Hall', width: 800, height: 533, sizes: [{ url: `${base}/api/media/file/h-800.webp`, width: 800, height: 533 }] })
    expectNoInternal(wire)
  })
})

describe('upTo', () => {
  it('keeps the smallest size when every size is wider', () => {
    const image = { alt: '', width: 2000, height: 1000, sizes: [{ url: 'https://x.test/a', width: 1600, height: 800 }, { url: 'https://x.test/b', width: 2000, height: 1000 }] }
    expect(upTo(image, 800).sizes).toEqual([{ url: 'https://x.test/a', width: 1600, height: 800 }])
  })
})
