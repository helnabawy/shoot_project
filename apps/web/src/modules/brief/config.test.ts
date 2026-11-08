import { describe, expect, it } from 'vitest'
import type { LandingPage } from '@/payload-types'
import { buildBriefConfig } from './config'

const personas = [
  { id: '1', slug: 'photographer', singular: 'Photographer', plural: 'Photographers', order: 1, active: true, glyph: 'PH' },
  { id: '2', slug: 'videographer', singular: 'Videographer', plural: 'Videographers', order: 2, active: true },
]

const landing = (builder: Partial<NonNullable<LandingPage['briefBuilder']>> | null) =>
  ({ id: 1, hero: { headline: 'x' }, briefBuilder: builder }) as unknown as LandingPage

describe('brief builder config from the CMS', () => {
  it('maps persona and option-set slots, translating persona ids to slugs and dropping inactive options', () => {
    const config = buildBriefConfig(
      landing({
        enabled: true,
        sentence: 'I need a {persona} for {occasion}',
        slots: [
          { token: 'persona', kind: 'persona', defaultValue: 'photographer', required: true },
          {
            token: 'occasion',
            kind: 'options',
            groupLabel: 'Occasion',
            placeholder: 'choose one',
            optionSet: {
              id: 9,
              name: 'Occasions',
              slug: 'occasions',
              options: [
                { value: 'drone', label: 'drone shots', order: 2, active: true, personas: [2] },
                { value: 'event', label: 'an event', order: 1, active: true, personas: [] },
                { value: 'old', label: 'old', order: 0, active: false },
              ],
            },
          },
        ] as never,
        submitLabel: 'Go',
      }),
      personas,
      'en',
    )
    expect(config?.slots[0]?.options.map((o) => [o.value, o.label, o.sentenceLabel])).toEqual([
      ['photographer', 'Photographer', 'photographer'],
      ['videographer', 'Videographer', 'videographer'],
    ])
    expect(config?.slots[1]?.options.map((o) => [o.value, o.personas])).toEqual([
      ['event', []],
      ['drone', ['videographer']],
    ])
    expect(config?.whatsappTemplate).toBe('I need a {persona} for {occasion}')
    expect(config?.slots[0]?.groupLabel).toBe('persona')
    expect(config?.slots.map((s) => s.multiple)).toEqual([false, false])
  })

  it('returns null when the builder is disabled or has no sentence', () => {
    expect(buildBriefConfig(landing({ enabled: false, sentence: 'x' }), personas, 'en')).toBeNull()
    expect(buildBriefConfig(landing(null), personas, 'en')).toBeNull()
  })

  it('leaves an unpopulated option set empty', () => {
    const config = buildBriefConfig(landing({ sentence: '{x}', slots: [{ token: 'x', kind: 'options', optionSet: 3 }] as never }), personas, 'en')
    expect(config?.slots[0]?.options).toEqual([])
  })

  it('FR-063 maps "pick more than one" for the professional slot only', () => {
    const config = buildBriefConfig(
      landing({
        sentence: '{persona} {occasion}',
        slots: [
          { token: 'persona', kind: 'persona', multiple: true },
          { token: 'occasion', kind: 'options', multiple: true, optionSet: 3 },
        ] as never,
      }),
      personas,
      'en',
    )
    expect(config?.slots.map((s) => s.multiple)).toEqual([true, false])
  })

  it('does not throw when handed a malformed locale tag (e.g. /favicon.ico reaching [locale])', () => {
    const config = buildBriefConfig(
      landing({ sentence: '{persona}', slots: [{ token: 'persona', kind: 'persona' }] as never }),
      personas,
      'favicon.ico',
    )
    expect(config?.slots[0]?.options.length).toBe(personas.length)
  })
})
