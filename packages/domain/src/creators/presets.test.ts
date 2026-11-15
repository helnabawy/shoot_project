import { describe, expect, it } from 'vitest'
import { briefPresets } from './presets'

const shotBy = {
  token: 'shotBy',
  filtersCreators: true,
  options: [
    { value: 'anyone', matchesAny: true },
    { value: 'woman' },
    { value: 'man' },
    { value: 'retired', active: false },
  ],
}
const occasion = { token: 'occasion', filtersCreators: false, options: [{ value: 'wedding' }, { value: 'party' }] }

describe('MC-US2-S7 a brief step that filters creators starts on the creator’s option (011 FR-036)', () => {
  it('presets the one option the creator matches, by its token', () => {
    expect(briefPresets([occasion, shotBy], ['man'])).toEqual({ shotBy: 'man' })
  })

  it('ignores steps that do not filter, "anyone" options and options switched off', () => {
    expect(briefPresets([occasion], ['wedding'])).toEqual({})
    expect(briefPresets([shotBy], ['anyone'])).toEqual({})
    expect(briefPresets([shotBy], ['retired'])).toEqual({})
  })

  it('presets nothing when the creator matches none, or more than one, of a step’s options', () => {
    expect(briefPresets([shotBy], [])).toEqual({})
    expect(briefPresets([shotBy], ['woman', 'man'])).toEqual({})
    expect(briefPresets([{ ...shotBy, filtersCreators: null }], ['man'])).toEqual({})
  })
})
