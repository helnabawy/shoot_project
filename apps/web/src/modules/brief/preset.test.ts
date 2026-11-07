import { describe, expect, it } from 'vitest'
import { resolvePresets } from './preset'
import type { BriefBuilderConfig, BuilderSlot } from './types'

const slot = (token: string, kind: BuilderSlot['kind'], values: string[], extra: Partial<BuilderSlot> = {}): BuilderSlot => ({
  token,
  kind,
  groupLabel: token,
  placeholder: token,
  defaultValue: '',
  required: true,
  allowCustom: false,
  multiple: false,
  options: values.map((value) => ({ value, label: value, sentenceLabel: value, personas: [] })),
  ...extra,
})

const config: BriefBuilderConfig = {
  locale: 'en',
  sentence: 'I need {persona} for {occasion} on {date} in {location}',
  slots: [
    slot('persona', 'persona', ['photographer', 'videographer'], { multiple: true }),
    slot('occasion', 'options', ['proposal', 'wedding']),
    slot('date', 'date', []),
    slot('location', 'options', ['dubai', 'abu-dhabi']),
  ],
  submitLabel: '',
  helperText: '',
  whatsappTemplate: '',
  successMessage: '',
  steps: [],
}

describe('MP-US4-S1 resolvePresets', () => {
  it('maps the professional type, and the specialty and location to the steps that offer them', () => {
    expect(resolvePresets(config, { persona: 'photographer', specialty: 'proposal', location: 'dubai' })).toEqual({
      values: { persona: 'photographer', occasion: 'proposal', location: 'dubai' },
      dropped: [],
    })
  })

  it('adds explicit answers for other steps, which win over the implicit ones', () => {
    const { values, dropped } = resolvePresets(config, { specialty: 'proposal', extra: [{ token: 'occasion', value: 'wedding' }, { token: 'date', value: '2026-12-01' }] })
    expect(values).toEqual({ occasion: 'wedding', date: '2026-12-01' })
    expect(dropped).toEqual([])
  })

  it('returns nothing for an empty intent or an empty configuration', () => {
    expect(resolvePresets(config, {})).toEqual({ values: {}, dropped: [] })
    expect(resolvePresets({ ...config, slots: [] }, { persona: 'photographer' })).toEqual({
      values: {},
      dropped: [{ token: 'persona', value: 'photographer', reason: 'inactivePersona' }],
    })
  })
})

describe('MP-US4-S2 resolvePresets drops what no longer exists, without throwing', () => {
  it('reports a professional type that is not offered (switched off) and leaves the step open', () => {
    expect(resolvePresets(config, { persona: 'teacher', location: 'dubai' })).toEqual({
      values: { location: 'dubai' },
      dropped: [{ token: 'persona', value: 'teacher', reason: 'inactivePersona' }],
    })
  })

  it('reports explicit answers for a step that is gone or an option that is gone', () => {
    const { values, dropped } = resolvePresets(config, { extra: [{ token: 'budget', value: '500' }, { token: 'occasion', value: 'gala' }, { token: 'location', value: 'sharjah' }, { token: '', value: 'x' }, { token: 'date', value: null }] })
    expect(values).toEqual({})
    expect(dropped).toEqual([
      { token: 'budget', value: '500', reason: 'unknownStep' },
      { token: 'occasion', value: 'gala', reason: 'unknownOption' },
      { token: 'location', value: 'sharjah', reason: 'unknownOption' },
    ])
  })

  it('quietly skips a specialty or location that no step offers', () => {
    expect(resolvePresets(config, { specialty: 'astrophotography', location: 'sharjah' })).toEqual({ values: {}, dropped: [] })
  })
})
