import { describe, expect, it } from 'vitest'
import { checkSlot } from './validate'
import { isolateLtr, startTimeOf, withTimeToken } from './time'

describe('BT-US2-S1 the start time of a time option', () => {
  it('reads HH-MM, HH:MM and HHMM as a 24-hour time', () => {
    expect(startTimeOf('16-00')).toBe('16:00')
    expect(startTimeOf('09:30')).toBe('09:30')
    expect(startTimeOf('0745')).toBe('07:45')
    expect(startTimeOf(' 23-59 ')).toBe('23:59')
  })

  it('gives no time for any other value', () => {
    for (const value of ['', 'morning', '24-00', '9-00', '12-60', '16-00-00', null, undefined]) expect(startTimeOf(value)).toBeNull()
  })
})

describe('BT-US3-S1 the time token joins the sentence after the date', () => {
  const at = { dateToken: 'date', timeToken: 'time', connector: 'at' }

  it('inserts the joining words and the token right after the date', () => {
    expect(withTimeToken('I need a {persona} on {date} for {duration}.', at)).toBe('I need a {persona} on {date} at {time} for {duration}.')
    expect(withTimeToken('أحتاج {persona} يوم {date}.', { ...at, connector: 'الساعة' })).toBe('أحتاج {persona} يوم {date} الساعة {time}.')
  })

  it('inserts the token alone when there are no joining words', () => {
    expect(withTimeToken('on {date}, please', { ...at, connector: '  ' })).toBe('on {date} {time}, please')
  })

  it('leaves a template without the date, or one that already has the time, unchanged', () => {
    expect(withTimeToken('I need a {persona}.', at)).toBe('I need a {persona}.')
    expect(withTimeToken('on {date} at {time}', at)).toBe('on {date} at {time}')
  })
})

describe('BT-US1-S2 times read left to right', () => {
  it('isolates a time as left-to-right text', () => {
    expect(isolateLtr('4 pm')).toBe('\u20664 pm\u2069')
    expect(isolateLtr('')).toBe('')
  })

  it('checks a time like an option list', () => {
    const slot = { token: 'time', kind: 'time' as const, required: true, allowedValues: ['16-00'] }
    expect(checkSlot(slot, '16-00', '2026-11-18')).toBeNull()
    expect(checkSlot(slot, '17-00', '2026-11-18')).toBe('brief.errors.notAnOption')
    expect(checkSlot(slot, '', '2026-11-18')).toBe('brief.errors.required')
  })
})
