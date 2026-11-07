import { describe, expect, it } from 'vitest'
import { canAddSample, isAllowedVideoUrl, MAX_SPECIALTY_SAMPLES, pickSpecialtySamples, specialtyCounts } from './samples'

describe('CP-US3-S1 video samples', () => {
  it.each([
    'https://www.youtube.com/watch?v=abc123',
    'https://youtube.com/shorts/abc123',
    'https://youtu.be/abc123',
    'https://vimeo.com/123456',
    'https://player.vimeo.com/video/123456',
  ])('accepts %s', (url) => {
    expect(isAllowedVideoUrl(url)).toBe(true)
  })

  it.each([
    'http://youtube.com/watch?v=abc',
    'https://evil.com/watch?v=abc',
    'https://youtube.com.evil.com/x',
    'https://notyoutube.com/x',
    'javascript:alert(1)',
    'youtube.com/watch?v=abc',
    '',
  ])('rejects %j', (url) => {
    expect(isAllowedVideoUrl(url)).toBe(false)
  })

  it('allows a sample while under the cap and refuses the 31st', () => {
    expect(canAddSample(0)).toBe(true)
    expect(canAddSample(29)).toBe(true)
    expect(canAddSample(30)).toBe(false)
    expect(canAddSample(31)).toBe(false)
  })
})

const creator = (id: string, specialtyIds: string[], sampleCounts: Record<string, number>) => ({ id, specialtyIds, sampleCounts })

describe('CP-US4-S1 specialty counts', () => {
  it('counts the sample rows of a specialty and the professionals who offer it, per specialty', () => {
    const counts = specialtyCounts([
      creator('a', ['10', '11'], { '10': 3, '11': 1 }),
      creator('b', ['10'], { '10': 2 }),
      creator('c', ['11'], {}),
    ])
    expect(counts['10']).toEqual({ samples: 5, pros: 2 })
    expect(counts['11']).toEqual({ samples: 1, pros: 2 })
  })

  it('a professional without samples still counts as a pro; a specialty nobody offers is absent, never zero', () => {
    const counts = specialtyCounts([creator('a', ['10'], {})])
    expect(counts['10']).toEqual({ samples: 0, pros: 1 })
    expect(counts['99']).toBeUndefined()
    expect(specialtyCounts([])).toEqual({})
  })

  it('ignores sample rows filed under a specialty the creator does not list (they are never public)', () => {
    expect(specialtyCounts([creator('a', ['10'], { '10': 1, '12': 4 })])).toEqual({ '10': { samples: 1, pros: 1 } })
  })
})

describe('CP-US4-S1 picking the samples shown on a specialty page', () => {
  const entry = (id: string, publishedAt: string, count: number) => ({
    id,
    publishedAt,
    samples: Array.from({ length: count }, (_, i) => `${id}${i + 1}`),
  })
  const ids = (picked: { sample: string }[]) => picked.map((p) => p.sample)

  it('takes one sample per creator before a second from the same creator, newest creators first', () => {
    const picked = pickSpecialtySamples([entry('old', '2026-01-01', 3), entry('new', '2026-03-01', 2), entry('mid', '2026-02-01', 1)], 10)
    expect(ids(picked)).toEqual(['new1', 'mid1', 'old1', 'new2', 'old2', 'old3'])
    expect(picked.map((p) => p.creatorId)).toEqual(['new', 'mid', 'old', 'new', 'old', 'old'])
  })

  it('stops at the limit, which defaults to 24', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry(`c${String(i).padStart(2, '0')}`, `2026-01-${String(i + 1).padStart(2, '0')}`, 2))
    expect(MAX_SPECIALTY_SAMPLES).toBe(24)
    expect(pickSpecialtySamples(many)).toHaveLength(24)
    expect(pickSpecialtySamples(many, 5)).toHaveLength(5)
    // The first round alone fills the page with the newest creators, never two from one creator.
    expect(new Set(pickSpecialtySamples(many).map((p) => p.creatorId)).size).toBe(24)
  })

  it('breaks a tie on the date by id so the page never reshuffles', () => {
    const picked = pickSpecialtySamples([entry('b', '2026-01-01', 1), entry('a', '2026-01-01', 1)], 5)
    expect(picked.map((p) => p.creatorId)).toEqual(['a', 'b'])
  })

  it('skips creators without samples, and returns nothing for no creators or a zero limit', () => {
    expect(pickSpecialtySamples([entry('a', '2026-01-01', 0)], 5)).toEqual([])
    expect(pickSpecialtySamples([], 5)).toEqual([])
    expect(pickSpecialtySamples([entry('a', '2026-01-01', 2)], 0)).toEqual([])
  })

  it('does not change the list it is given', () => {
    const input = [entry('a', '2026-01-01', 2), entry('b', '2026-02-01', 2)]
    pickSpecialtySamples(input, 3)
    expect(input.map((c) => c.id)).toEqual(['a', 'b'])
    expect(input[0]!.samples).toHaveLength(2)
  })
})
