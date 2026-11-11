import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { creatorCardV1 } from './creators'
import { ctaV1, heroV1, landingV1, SECTION_TYPES, sectionV1, type SectionV1 } from './landing'

const landing = JSON.parse(readFileSync(join(import.meta.dirname, 'examples', 'landing.json'), 'utf8')) as Record<string, unknown> & {
  hero: Record<string, unknown>
  sections: (SectionV1 & Record<string, unknown>)[]
}

const without = (value: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key))

describe('landingV1', () => {
  it('accepts its example', () => {
    expect(landingV1.safeParse(landing).success).toBe(true)
  })

  it('refuses a missing required field', () => {
    for (const key of Object.keys(landing)) expect(landingV1.safeParse(without(landing, key)).success, key).toBe(false)
    for (const key of Object.keys(landing.hero)) expect(heroV1.safeParse(without(landing.hero, key)).success, `hero.${key}`).toBe(false)
  })
})

describe('MR-US1-S5 sectionV1', () => {
  it('the example carries each of the nine types', () => {
    expect(new Set(landing.sections.map((s) => s.type))).toEqual(new Set(SECTION_TYPES))
    expect(SECTION_TYPES).toHaveLength(9)
  })

  it.each(SECTION_TYPES)('accepts %s, and refuses it without its heading or content', (type) => {
    const section = landing.sections.find((s) => s.type === type) as Record<string, unknown>
    expect(sectionV1.safeParse(section).success).toBe(true)
    const key = type === 'richText' ? 'content' : 'heading'
    expect(sectionV1.safeParse(without(section, key)).success).toBe(false)
  })

  it('refuses an unknown type', () => {
    const section = landing.sections[0] as Record<string, unknown>
    expect(sectionV1.safeParse({ ...section, type: 'carousel' }).success).toBe(false)
  })
})

describe('ctaV1', () => {
  const base = { label: 'See all', kind: 'link' }

  it('takes a site path or an absolute url', () => {
    expect(ctaV1.safeParse({ ...base, path: '/creators', url: null }).success).toBe(true)
    expect(ctaV1.safeParse({ ...base, kind: 'whatsapp', path: null, url: 'https://wa.me/971500000000' }).success).toBe(true)
    expect(ctaV1.safeParse({ ...base, kind: 'call', path: null, url: 'tel:+971500000000' }).success).toBe(true)
  })

  it('refuses both, neither, a language prefix or a relative url', () => {
    expect(ctaV1.safeParse({ ...base, path: '/creators', url: 'https://shoot.example/creators' }).success).toBe(false)
    expect(ctaV1.safeParse({ ...base, path: null, url: null }).success).toBe(false)
    expect(ctaV1.safeParse({ ...base, path: '/ar/creators', url: null }).success).toBe(false)
    expect(ctaV1.safeParse({ ...base, path: null, url: 'creators' }).success).toBe(false)
  })
})

describe('creatorCardV1', () => {
  const network = landing.sections.find((s) => s.type === 'creatorNetwork') as { creators: Record<string, unknown>[] }

  it('carries the Omar K. card from the canvas', () => {
    const omar = creatorCardV1.parse(network.creators[0])
    expect(omar).toMatchObject({
      displayCode: 'SH-0087',
      name: 'Omar K.',
      places: ['Sharjah', 'Dubai'],
      specialties: ['Weddings', 'Events', 'Portraits'],
      languages: ['Arabic', 'English'],
      yearsExperience: 6,
    })
  })

  it('refuses a missing field and a negative count', () => {
    const card = network.creators[0] as Record<string, unknown>
    for (const key of Object.keys(card)) expect(creatorCardV1.safeParse(without(card, key)).success, key).toBe(false)
    expect(creatorCardV1.safeParse({ ...card, sampleCount: -1 }).success).toBe(false)
    expect(creatorCardV1.safeParse({ ...card, yearsExperience: null, photo: null }).success).toBe(true)
  })
})
