import { describe, expect, it } from 'vitest'
import { briefSchema, CUSTOM_TEXT_MAX, todayInZone, type SlotRule } from './schema'

const slots: SlotRule[] = [
  { token: 'persona', kind: 'persona', required: true, allowedValues: ['1', '2'] },
  { token: 'occasion', kind: 'options', required: true, allowCustom: true, allowedValues: ['event', 'wedding'] },
  { token: 'date', kind: 'date', required: false },
  { token: 'duration', kind: 'options', required: true, allowedValues: ['1h', '2h'] },
  { token: 'guests', kind: 'number', required: false },
]
const schema = briefSchema(slots, { today: '2026-11-07' })
const base = { persona: '1', occasion: 'event', date: '', duration: '2h' }
const errorFor = (input: object, path: string) =>
  schema.safeParse(input).error?.issues.find((i) => i.path[0] === path)?.message

describe('FR-050 brief validation', () => {
  it('accepts a complete brief with "any date"', () => {
    expect(schema.parse(base)).toMatchObject({ persona: '1', date: '' })
  })

  it('US8-S4 requires required slots', () => {
    expect(errorFor({ ...base, persona: ' ' }, 'persona')).toBe('brief.errors.required')
    expect(errorFor({ occasion: 'event', duration: '2h' }, 'persona')).toBe('brief.errors.required')
  })

  it('rejects past dates in the business time zone and accepts today', () => {
    expect(errorFor({ ...base, date: '2026-11-06' }, 'date')).toBe('brief.errors.datePast')
    expect(schema.safeParse({ ...base, date: '2026-11-07' }).success).toBe(true)
    expect(errorFor({ ...base, date: '07/11/2026' }, 'date')).toBe('brief.errors.dateInvalid')
    expect(errorFor({ ...base, date: '2026-13-45' }, 'date')).toBe('brief.errors.dateInvalid')
  })

  it('accepts typed words where the editor allows custom text, capped in length', () => {
    expect(schema.safeParse({ ...base, occasion: 'a graduation' }).success).toBe(true)
    expect(errorFor({ ...base, occasion: 'x'.repeat(CUSTOM_TEXT_MAX + 1) }, 'occasion')).toBe('brief.errors.tooLong')
  })

  it('rejects values that are not options when custom text is not allowed', () => {
    expect(errorFor({ ...base, duration: '9h' }, 'duration')).toBe('brief.errors.notAnOption')
  })

  it('validates number slots', () => {
    expect(schema.safeParse({ ...base, guests: '40' }).success).toBe(true)
    expect(errorFor({ ...base, guests: '0' }, 'guests')).toBe('brief.errors.numberInvalid')
    expect(errorFor({ ...base, guests: 'many' }, 'guests')).toBe('brief.errors.numberInvalid')
  })

  it('accepts any value when the slot has no option list', () => {
    const open = briefSchema([{ token: 'note', kind: 'options', required: false }], { today: '2026-01-01' })
    expect(open.parse({ note: 'anything' })).toEqual({ note: 'anything' })
  })

  it('defaults "today" to the UAE calendar date', () => {
    expect(briefSchema([{ token: 'd', kind: 'date', required: false }]).safeParse({ d: '2000-01-01' }).success).toBe(false)
  })
})

describe('todayInZone', () => {
  it('uses the UAE date even when UTC is still on the previous day', () => {
    // 22:30 UTC on 6 Nov is 02:30 on 7 Nov in Dubai (UTC+4).
    expect(todayInZone(new Date('2026-11-06T22:30:00Z'))).toBe('2026-11-07')
    expect(todayInZone(new Date('2026-11-06T22:30:00Z'), 'UTC')).toBe('2026-11-06')
  })
})
