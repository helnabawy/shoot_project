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
