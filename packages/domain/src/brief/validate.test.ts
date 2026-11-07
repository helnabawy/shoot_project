import { describe, expect, it } from 'vitest'
import { joinMultiValue, splitMultiValue, validateBrief, type SlotRule } from './validate'

const slots: SlotRule[] = [
  { token: 'persona', kind: 'persona', required: true, allowedValues: ['photographer'] },
  { token: 'date', kind: 'date', required: false },
]

describe('validateBrief (dependency-free, used in the browser)', () => {
  it('returns no errors for a valid brief', () => {
    expect(validateBrief(slots, { persona: 'photographer', date: '' }, { today: '2026-11-07' })).toEqual({})
  })

  it('returns one error key per invalid slot', () => {
    expect(validateBrief(slots, { persona: 'x', date: '2026-01-01' }, { today: '2026-11-07' })).toEqual({
      persona: 'brief.errors.notAnOption',
      date: 'brief.errors.datePast',
    })
  })

  it('defaults "today" to the UAE date', () => {
    expect(validateBrief(slots, { persona: 'photographer', date: '2000-01-01' })).toEqual({ date: 'brief.errors.datePast' })
  })
})

describe('FR-063 a slot that takes several values', () => {
  const multi: SlotRule[] = [{ token: 'persona', kind: 'persona', required: true, multiple: true, allowedValues: ['photographer', 'videographer'] }]

  it('splits and joins values in the order picked, dropping blanks', () => {
    expect(splitMultiValue(' photographer , ,videographer ')).toEqual(['photographer', 'videographer'])
    expect(splitMultiValue('')).toEqual([])
    expect(joinMultiValue(['videographer', ' ', 'photographer'])).toBe('videographer,photographer')
  })

  it('accepts one or several allowed values', () => {
    expect(validateBrief(multi, { persona: 'videographer' })).toEqual({})
    expect(validateBrief(multi, { persona: 'photographer,videographer' })).toEqual({})
  })

  it('requires at least one value and rejects unknown or repeated ones', () => {
    expect(validateBrief(multi, { persona: ' , ' })).toEqual({ persona: 'brief.errors.required' })
    expect(validateBrief(multi, {})).toEqual({ persona: 'brief.errors.required' })
    expect(validateBrief(multi, { persona: 'photographer,teacher' })).toEqual({ persona: 'brief.errors.notAnOption' })
    expect(validateBrief(multi, { persona: 'photographer,photographer' })).toEqual({ persona: 'brief.errors.notAnOption' })
  })

  it('accepts nothing for an optional slot and caps the length of each value', () => {
    const optional: SlotRule[] = [{ token: 'extra', kind: 'options', required: false, multiple: true }]
    expect(validateBrief(optional, { extra: '' })).toEqual({})
    expect(validateBrief(optional, { extra: `a,${'x'.repeat(81)}` })).toEqual({ extra: 'brief.errors.tooLong' })
  })

  it('ignores the setting on date and number slots', () => {
    const odd: SlotRule[] = [
      { token: 'date', kind: 'date', required: false, multiple: true },
      { token: 'guests', kind: 'number', required: false, multiple: true },
    ]
    expect(validateBrief(odd, { date: '2026-01-01,2026-01-02', guests: '3' }, { today: '2026-11-07' })).toEqual({ date: 'brief.errors.dateInvalid' })
  })
})
