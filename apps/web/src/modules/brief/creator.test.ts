import { describe, expect, it } from 'vitest'
import { briefBuilderFixture } from '../../../tests/fixtures/brief-builder'
import { configForCreator, fillCreatorPersona, personasOutside } from './creator'

const config = briefBuilderFixture('en', ['photographer', 'videographer', 'teacher'])
const personaOptions = (c: typeof config) => c.slots.find((s) => s.kind === 'persona')!.options.map((o) => o.value)

describe('CP-US2-S2 the brief builder for one creator', () => {
  it('a creator with one listed type locks the professional step to it', () => {
    const result = configForCreator(config, ['videographer'])!
    expect(personaOptions(result.config)).toEqual(['videographer'])
    expect(result.locked).toEqual({ token: 'persona', value: 'videographer' })
  })

  it('a creator with several types offers only those types and locks nothing', () => {
    const result = configForCreator(config, ['teacher', 'photographer'])!
    expect(personaOptions(result.config)).toEqual(['photographer', 'teacher']) // the site's order, not the creator's
    expect(result.locked).toBeNull()
  })

  it('ignores types the site does not offer; none left means the creator cannot be booked', () => {
    expect(personaOptions(configForCreator(config, ['photographer', 'astronaut'])!.config)).toEqual(['photographer'])
    expect(configForCreator(config, ['astronaut'])).toBeNull()
    expect(configForCreator(config, [])).toBeNull()
  })

  it('leaves every other step untouched and does not change the original config', () => {
    const result = configForCreator(config, ['videographer'])!
    expect(result.config.slots.slice(1)).toEqual(config.slots.slice(1))
    expect(personaOptions(config)).toEqual(['photographer', 'videographer', 'teacher'])
  })

  it('a config without a professional step is returned as is, nothing locked', () => {
    const without = { ...config, slots: config.slots.filter((s) => s.kind !== 'persona') }
    expect(configForCreator(without, ['photographer'])).toEqual({ config: without, locked: null })
  })
})

describe('creator persona rules on submit', () => {
  it('lists chosen types the creator does not offer', () => {
    expect(personasOutside(['photographer', 'teacher'], ['photographer', 'videographer'])).toEqual(['teacher'])
    expect(personasOutside(['photographer'], ['photographer'])).toEqual([])
    expect(personasOutside([], ['photographer'])).toEqual([])
  })

  it('fills in the only type of a single-type creator when the form has none', () => {
    const form = new FormData()
    form.set('occasion', 'event')
    const filled = fillCreatorPersona(form, config, ['videographer'])
    expect(filled.get('persona')).toBe('videographer')
    expect(filled.get('occasion')).toBe('event')
    expect(form.get('persona')).toBeNull() // the original is untouched
  })

  it('does not overwrite a chosen type, nor guess when the creator has several', () => {
    const chosen = new FormData()
    chosen.set('persona', 'photographer')
    expect(fillCreatorPersona(chosen, config, ['videographer']).get('persona')).toBe('photographer')
    expect(fillCreatorPersona(new FormData(), config, ['photographer', 'videographer']).get('persona')).toBeNull()
  })

  it('does nothing without a professional step', () => {
    const without = { ...config, slots: config.slots.filter((s) => s.kind !== 'persona') }
    expect([...fillCreatorPersona(new FormData(), without, ['photographer']).keys()]).toEqual([])
  })
})
