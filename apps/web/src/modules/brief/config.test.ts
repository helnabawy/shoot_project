import { describe, expect, it } from 'vitest'
import type { LandingPage, OptionSet } from '@/payload-types'
import { briefBuilderFixture } from '../../../tests/fixtures/brief-builder'
import { buildBriefConfig, withBriefTime } from './config'

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

describe('026 the start time step', () => {
  const base = () => briefBuilderFixture('en')
  const times = {
    id: 7,
    name: 'Start times',
    slug: 'start-times',
    options: [
      { value: '16-00', label: '16:00', order: 2, active: true },
      { value: '09-00', label: '09:00', order: 1, active: true },
      { value: '05-00', label: '05:00', order: 0, active: false },
    ],
  } as unknown as OptionSet
  const on = { enabled: true, required: false, times, groupLabel: 'Start time', anyTime: 'any time', connector: 'at' }

  it('BT-US1-S1 adds a time step right after the date, in the slots, the sentence and the WhatsApp template', () => {
    const config = withBriefTime({ ...base(), whatsappTemplate: 'Hi! A {persona} on {date}.' }, on)
    expect(config.slots.map((s) => s.token)).toEqual(['persona', 'occasion', 'date', 'time', 'duration', 'location'])
    const slot = config.slots[3]!
    expect(slot).toMatchObject({ kind: 'time', groupLabel: 'Start time', placeholder: 'any time', required: false, allowCustom: false, multiple: false })
    expect(slot.options.map((o) => [o.value, o.label])).toEqual([
      ['09-00', '09:00'],
      ['16-00', '16:00'],
    ])
    expect(config.sentence).toBe('I need a {persona} for {occasion} on {date} at {time} for {duration} in {location}.')
    expect(config.whatsappTemplate).toBe('Hi! A {persona} on {date} at {time}.')
  })

  it('BT-US1-S2 an Arabic time reads left to right in the sentence', () => {
    const config = withBriefTime(briefBuilderFixture('ar'), { ...on, connector: 'الساعة' })
    expect(config.slots[3]?.options[0]?.sentenceLabel).toBe('\u206609:00\u2069')
    expect(config.slots[3]?.options[0]?.label).toBe('09:00')
    expect(config.sentence).toContain('{date} الساعة {time}')
  })

  it('BT-US1-S3 the owner can make the time required', () => {
    expect(withBriefTime(base(), { ...on, required: true }).slots[3]?.required).toBe(true)
  })

  it('BT-US3-S1 off, without a time list or without a date step, the config is unchanged', () => {
    const config = base()
    expect(withBriefTime(config, { ...on, enabled: false })).toBe(config)
    expect(withBriefTime(config, { ...on, times: null })).toBe(config)
    expect(withBriefTime(config, { ...on, times: 7 as never })).toBe(config)
    expect(withBriefTime(config, { ...on, times: { ...times, options: [times.options![2]!] } as OptionSet })).toBe(config)
    const noDate = { ...config, slots: config.slots.filter((s) => s.kind !== 'date') }
    expect(withBriefTime(noDate, on)).toBe(noDate)
    const dateNotAsked = { ...config, sentence: 'I need a {persona}.' }
    expect(withBriefTime(dateNotAsked, on)).toBe(dateNotAsked)
    expect(withBriefTime(null, on)).toBeNull()
  })

  it('BT-US3-S1 a sentence that already has a time token keeps its own and gets no second one', () => {
    const config = { ...base(), slots: [...base().slots, { ...base().slots[1]!, token: 'time' }] }
    expect(withBriefTime(config, on)).toBe(config)
  })
})
