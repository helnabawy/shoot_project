import type { CreatorSummary } from '@shoot/domain/creators'

/** A public creator summary for component and server tests; override what a test cares about. */
export function creatorSummary(over: Partial<CreatorSummary> = {}): CreatorSummary {
  return {
    id: '1',
    code: '7K4Q2',
    displayName: 'Sara Khan',
    bio: 'Weddings and portraits across Dubai.',
    photo: { url: '/api/media/file/sara-400x300.webp', alt: 'Sara Khan', width: 400, height: 300 },
    personaIds: ['1'],
    specialtyIds: ['10'],
    locationIds: ['100'],
    emirateIds: ['100'],
    languages: ['en', 'ar'],
    sampleCounts: { '10': 4 },
    sampleCount: 4,
    featured: false,
    publishedAt: '2026-11-01T08:00:00.000Z',
    ...over,
  }
}

/** The same creators in English and Arabic, with and without samples (CP-FR-010). */
export const creatorsEn: CreatorSummary[] = [
  creatorSummary({ id: '1', code: '7K4Q2', displayName: 'Sara Khan', featured: true }),
  creatorSummary({ id: '2', code: '3M8TN', displayName: 'Omar Haddad', personaIds: ['2'], specialtyIds: ['11'], sampleCounts: { '11': 2 }, sampleCount: 2, publishedAt: '2026-11-03T08:00:00.000Z' }),
  creatorSummary({ id: '3', code: '9PX5H', displayName: 'Lina Aziz', photo: null, sampleCounts: {}, sampleCount: 0, publishedAt: '2026-11-05T08:00:00.000Z' }),
]

export const creatorsAr: CreatorSummary[] = creatorsEn.map((c, i) => ({
  ...c,
  displayName: ['سارة خان', 'عمر حداد', 'لينا عزيز'][i] ?? c.displayName,
  bio: 'تصوير أعراس وبورتريه في دبي.',
}))

import type { ProfileView } from '../../src/modules/creators/profile'

const image = (n: number) => ({ url: `/api/media/file/s${n}-card.webp`, width: 800, height: 1000 })
const large = (n: number) => ({ url: `/api/media/file/s${n}-hero.webp`, width: 1600, height: 2000 })

/** A full public profile view for component tests. */
export function profileView(over: Partial<ProfileView> = {}): ProfileView {
  return {
    id: '1',
    code: '7K4Q2',
    name: 'Sara Khan',
    initials: 'SK',
    bio: 'Weddings and portraits.\nBased in Dubai.',
    photo: { url: '/api/media/file/sara-400.webp', alt: 'Sara Khan', width: 400, height: 400 },
    types: 'Photographer and videographer',
    places: ['Dubai Marina', 'Abu Dhabi'],
    specialties: ['Portrait', 'Wedding & engagement'],
    languages: ['English', 'Arabic'],
    nationality: '',
    yearsExperience: null,
    samples: [
      { id: 'a', kind: 'image', thumb: image(1), large: large(1), alt: 'A bride at golden hour', caption: 'Golden hour', specialty: 'Wedding & engagement' },
      { id: 'b', kind: 'video', thumb: image(2), large: large(2), alt: 'Showreel poster', caption: 'Showreel', specialty: '', videoUrl: 'https://www.youtube.com/watch?v=abc', provider: 'YouTube' },
      { id: 'c', kind: 'image', thumb: image(3), large: large(3), alt: 'A portrait by the window', caption: '', specialty: 'Portrait' },
    ],
    social: [
      { platform: 'instagram', url: 'https://instagram.com/sara' },
      { platform: 'website', url: 'https://sara.example' },
    ],
    shareImage: large(1),
    ...over,
  }
}

import type { MyProfile, MySample, SelectableOptions } from '../../src/modules/creators/my-profile'

export const selectableOptions: SelectableOptions = {
  personas: [{ id: 1, name: 'Photographer' }, { id: 2, name: 'Videographer' }],
  specialties: [
    { id: 10, name: 'Portrait', personaIds: [1, 2] },
    { id: 11, name: 'Events', personaIds: [1, 2] },
    { id: 12, name: 'Drone work', personaIds: [2] },
  ],
  emirates: [
    { id: 100, name: 'Dubai', cities: [{ id: 101, name: 'Dubai Marina' }] },
    { id: 200, name: 'Abu Dhabi', cities: [] },
  ],
  languages: [{ code: 'en', name: 'English' }, { code: 'ar', name: 'Arabic' }, { code: 'ur', name: 'Urdu' }],
  countries: [{ code: 'AE', name: 'United Arab Emirates' }, { code: 'IR', name: 'Iran' }],
}

export const mySample = (n: number, over: Partial<MySample> = {}): MySample => ({
  id: `s${n}`,
  kind: 'image',
  image: { id: n, url: `/api/media/file/s${n}.webp`, alt: `Sample ${n}` },
  videoUrl: '',
  caption: { en: `Caption ${n}`, ar: `تعليق ${n}` },
  category: 10,
  ...over,
})

/** A complete, live profile; override what a test cares about. */
export function myProfile(over: Partial<MyProfile> = {}): MyProfile {
  return {
    id: 1,
    code: '7K4Q2',
    status: 'live',
    displayName: { en: 'Sara Khan', ar: 'سارة خان' },
    bio: { en: 'Weddings and portraits.', ar: '' },
    personas: [1],
    specialties: [10, 11],
    cities: [101],
    languages: ['en', 'ar'],
    gender: 'woman',
    nationality: 'AE',
    yearsExperience: 8,
    social: [{ platform: 'instagram', url: 'https://instagram.com/sara' }],
    photo: null,
    samples: [mySample(1), mySample(2)],
    reviewNote: '',
    submittedAt: null,
    verifiedAt: '2026-11-01T08:00:00.000Z',
    hasNewerDraft: false,
    isPublished: true,
    paused: false,
    missing: [],
    autoPublish: false,
    ...over,
  }
}
