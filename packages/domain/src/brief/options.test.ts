import { describe, expect, it } from 'vitest'
import { optionsForSlot, type BriefOption } from './options'

const o = (value: string, order: number, personas: string[] = [], active = true): BriefOption => ({
  value,
  label: value,
  order,
  active,
  personas,
})

describe('FR-048 persona-filtered options', () => {
  const options = [
    o('wedding', 2),
    o('event', 1),
    o('drone', 3, ['videographer']),
    o('maths', 1, ['teacher']),
    o('archived', 0, [], false),
    o('birthday', 2),
  ]

  it('US8-S2 shows shared options plus the persona-specific ones, ordered', () => {
    expect(optionsForSlot(options, 'videographer').map((x) => x.value)).toEqual(['event', 'birthday', 'wedding', 'drone'])
  })

  it('shows only shared options when no persona is chosen', () => {
    expect(optionsForSlot(options, null).map((x) => x.value)).toEqual(['event', 'birthday', 'wedding'])
    expect(optionsForSlot(options, undefined)).toHaveLength(3)
  })

  it('hides inactive options', () => {
    expect(optionsForSlot(options, 'teacher').map((x) => x.value)).not.toContain('archived')
  })

  it('FR-063 shows options of any chosen persona when several are picked', () => {
    expect(optionsForSlot(options, ['videographer', 'teacher']).map((x) => x.value)).toEqual(['event', 'maths', 'birthday', 'wedding', 'drone'])
    expect(optionsForSlot(options, []).map((x) => x.value)).toEqual(['event', 'birthday', 'wedding'])
  })
})
