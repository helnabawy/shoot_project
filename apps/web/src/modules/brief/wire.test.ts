import { briefBuilderV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import type { BriefBuilderConfig } from './types'
import { toWireBriefBuilder } from './wire'

const config: BriefBuilderConfig = {
  locale: 'en',
  sentence: 'I need a {persona} for {occasion} on {date}.',
  slots: [
    {
      token: 'persona',
      kind: 'persona',
      groupLabel: 'Professional',
      placeholder: 'which professional',
      defaultValue: 'photographer',
      required: true,
      allowCustom: false,
      multiple: true,
      options: [{ value: 'photographer', label: 'Photographer', sentenceLabel: 'photographer', glyph: 'P', personas: [] }],
    },
    {
      token: 'occasion',
      kind: 'options',
      groupLabel: 'Occasion',
      placeholder: 'what occasion',
      defaultValue: 'event',
      required: true,
      allowCustom: true,
      multiple: false,
      options: [{ value: 'wedding', label: 'a wedding', sentenceLabel: 'a wedding', glyph: null, personas: ['photographer'] }],
    },
    { token: 'date', kind: 'date', groupLabel: 'When', placeholder: 'any date', defaultValue: '', required: false, allowCustom: false, multiple: false, options: [] },
  ],
  submitLabel: "See who's free",
  helperText: 'Free to ask.',
  whatsappTemplate: 'Hi! I need a {persona}.',
  successMessage: 'We have your brief.',
  steps: [{ title: 'Your shoot', description: 'Describe it in one line.' }],
}

describe('toWireBriefBuilder', () => {
  it('MR-US1-S5 maps the sentence, slots and options with persona slugs', () => {
    const wire = briefBuilderV1.parse(toWireBriefBuilder(config, 'en'))
    expect(wire.builder?.sentence).toBe(config.sentence)
    expect(wire.builder?.slots.map((s) => s.token)).toEqual(['persona', 'occasion', 'date'])
    expect(wire.builder?.slots[1]?.options[0]).toEqual({ value: 'wedding', label: 'a wedding', sentenceLabel: 'a wedding', glyph: null, personaSlugs: ['photographer'] })
    expect(wire.builder?.steps).toEqual([{ title: 'Your shoot', description: 'Describe it in one line.' }])
    expect(JSON.stringify(wire)).not.toContain('"personas"')
  })

  it('answers builder null when the builder is off', () => {
    expect(briefBuilderV1.parse(toWireBriefBuilder(null, 'ar'))).toEqual({ locale: 'ar', builder: null })
  })
})
