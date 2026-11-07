import { describe, expect, it } from 'vitest'
import { filterCreators } from '../creators/filter'
import type { CreatorSummary } from '../creators/types'
import { intentFingerprint, intentHasTarget, matchesIntent, similarIntents } from './intent'
import { serviceJsonLd } from './structured-data'

const creator = (over: Partial<CreatorSummary> = {}): CreatorSummary =>
  ({ id: '1', code: 'D2222', displayName: 'X', bio: '', photo: null, personaIds: ['p1'], specialtyIds: ['s1', 's2'], locationIds: ['marina'], emirateIds: ['dubai'], languages: [], sampleCounts: {}, sampleCount: 0, featured: false, publishedAt: '', ...over }) as CreatorSummary

describe('MP-US4-S5 intentFingerprint', () => {
  it('is the same for the same preset in any order, and different when anything differs', () => {
    const a = intentFingerprint({ personaId: 'p', specialtyId: 's', locationId: 'l', presets: [{ token: 'b', value: '2' }, { token: 'a', value: '1' }] })
    expect(intentFingerprint({ personaId: 'p', specialtyId: 's', locationId: 'l', presets: [{ token: 'a', value: '1' }, { token: 'b', value: '2' }] })).toBe(a)
    expect(intentFingerprint({ personaId: 'p', specialtyId: 's', locationId: 'l', presets: [{ token: 'a', value: '1' }] })).not.toBe(a)
    expect(intentFingerprint({ personaId: 'p', specialtyId: 's', locationId: 'other', presets: [] })).not.toBe(intentFingerprint({ personaId: 'p', specialtyId: 's' }))
  })
  it('treats missing and empty parts alike', () => {
    expect(intentFingerprint({})).toBe('||')
    expect(intentFingerprint({ personaId: null, presets: [{ token: '', value: 'x' }, { token: 'a', value: null }, { token: null, value: null }] })).toBe('||')
    expect(intentFingerprint({ presets: null })).toBe('||')
  })
  it('knows whether a page is about anything', () => {
    expect(intentHasTarget({})).toBe(false)
    expect(intentHasTarget({ presets: [{ token: 'a', value: '1' }] })).toBe(false)
    for (const key of ['personaId', 'specialtyId', 'locationId'] as const) expect(intentHasTarget({ [key]: 'x' })).toBe(true)
  })
})

describe('MP-US4-S4 matchesIntent', () => {
  it('needs every named part to match; a place matches a city or its emirate; no parts match everyone', () => {
    const c = creator()
    expect(matchesIntent(c, {})).toBe(true)
    expect(matchesIntent(c, { personaId: 'p1', specialtyId: 's2', locationId: 'dubai' })).toBe(true)
    expect(matchesIntent(c, { locationId: 'marina' })).toBe(true)
    expect(matchesIntent(c, { personaId: 'p2' })).toBe(false)
    expect(matchesIntent(c, { specialtyId: 's9' })).toBe(false)
    expect(matchesIntent(c, { locationId: 'abu-dhabi' })).toBe(false)
  })
  it('agrees with the directory filter wherever both apply', () => {
    const all = [creator(), creator({ id: '2', personaIds: ['p2'] }), creator({ id: '3', specialtyIds: ['s3'] }), creator({ id: '4', emirateIds: ['sharjah'], locationIds: ['x'] })]
    const filters = { personaId: 'p1', specialtyId: 's1', emirateId: 'dubai' }
    expect(all.filter((c) => matchesIntent(c, { personaId: 'p1', specialtyId: 's1', locationId: 'dubai' })).map((c) => c.id)).toEqual(filterCreators(all, filters).map((c) => c.id))
  })
})

describe('MP-US4-S3 serviceJsonLd', () => {
  it('describes the service, its area and the organisation that offers it', () => {
    expect(serviceJsonLd({ name: 'Proposal photographer in Dubai', serviceType: 'Proposal photography', areaServed: 'Dubai', provider: 'Shoot Project', url: 'https://x/hire/p', locale: 'en' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Proposal photographer in Dubai',
      url: 'https://x/hire/p',
      serviceType: 'Proposal photography',
      areaServed: 'Dubai',
      provider: { '@type': 'Organization', name: 'Shoot Project' },
      inLanguage: 'en',
    })
  })
  it('leaves out the type and the area when there are none', () => {
    const ld = serviceJsonLd({ name: 'N', provider: 'P', url: 'u', locale: 'ar', serviceType: null, areaServed: '' })
    expect(ld).not.toHaveProperty('serviceType')
    expect(ld).not.toHaveProperty('areaServed')
  })
})

describe('MP-US4-S5 similarIntents', () => {
  const page = (id: number, intent: object | null) => ({ id, intent })
  it('finds the other pages about the same thing, however the relations are shaped, and never the page itself', () => {
    const pages = [
      page(1, { persona: 5, specialty: { id: 7 }, location: '9' }),
      page(2, { persona: { id: 5 }, specialty: 7, location: 9 }),
      page(3, { persona: 5, specialty: 7 }),
      page(4, { persona: 5, specialty: 7, location: 9, presets: [{ token: 'occasion', value: 'proposal' }] }),
      page(5, null),
    ]
    const key = { personaId: '5', specialtyId: '7', locationId: '9' }
    expect(similarIntents(pages, key, 1).map((p) => p.id)).toEqual([2])
    expect(similarIntents(pages, key).map((p) => p.id)).toEqual([1, 2])
    expect(similarIntents(pages, {}, null).map((p) => p.id)).toEqual([5])
  })
})
