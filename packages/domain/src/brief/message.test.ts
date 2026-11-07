import { describe, expect, it } from 'vitest'
import { formatBriefDate, renderBriefMessage } from './message'

describe('FR-049 WhatsApp message rendering', () => {
  const template = 'Hi! I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.'

  it('fills every token', () => {
    expect(
      renderBriefMessage(template, {
        persona: 'photographer',
        occasion: 'an event',
        date: 'any date',
        duration: '2 hours',
        location: 'Dubai',
        shotBy: 'anyone',
      }),
    ).toBe('Hi! I need a photographer for an event on any date for 2 hours in Dubai, shot by anyone.')
  })

  it('drops missing tokens without leaving double spaces or a space before punctuation', () => {
    expect(renderBriefMessage('I need a {persona} in {location} , today', { persona: 'videographer' })).toBe(
      'I need a videographer in, today',
    )
  })

  it('renders Arabic templates', () => {
    expect(renderBriefMessage('أحتاج {persona} في {location}.', { persona: 'مصوّر', location: 'دبي' })).toBe('أحتاج مصوّر في دبي.')
  })
})

describe('CP-US2-S2 the creator in the message', () => {
  const labels = { persona: 'photographer' }

  it('fills the optional {creator} placeholder', () => {
    expect(renderBriefMessage('Hi! I need a {persona} — {creator}', labels, { creator: { creator: 'Sara Khan (CR-7K4Q2)' } })).toBe(
      'Hi! I need a photographer — Sara Khan (CR-7K4Q2)',
    )
  })

  it('a template without the placeholder gets the creator line on its own last line', () => {
    expect(renderBriefMessage('Hi! I need a {persona}.', labels, { creator: { creator: 'Sara Khan (CR-7K4Q2)', creatorLine: 'Creator: Sara Khan (CR-7K4Q2)' } })).toBe(
      'Hi! I need a photographer.\nCreator: Sara Khan (CR-7K4Q2)',
    )
  })

  it('uses the creator text as the line when no separate line is given', () => {
    expect(renderBriefMessage('Hi!', labels, { creator: { creator: 'Sara Khan (CR-7K4Q2)' } })).toBe('Hi!\nSara Khan (CR-7K4Q2)')
  })

  it('does not append a line when the template already has the placeholder', () => {
    const out = renderBriefMessage('Hi {creator}!', labels, { creator: { creator: 'Sara', creatorLine: 'Creator: Sara' } })
    expect(out).toBe('Hi Sara!')
  })

  it('leaves the message unchanged when no creator is given, and drops a stray {creator} token', () => {
    expect(renderBriefMessage('Hi! I need a {persona}.', labels)).toBe('Hi! I need a photographer.')
    expect(renderBriefMessage('Hi! {creator}', labels)).toBe('Hi!')
  })

  it('keeps Arabic creator text intact', () => {
    expect(renderBriefMessage('أحتاج {persona}.', { persona: 'مصوّر' }, { creator: { creator: 'سارة خان (CR-7K4Q2)', creatorLine: 'المحترف: سارة خان (CR-7K4Q2)' } })).toBe(
      'أحتاج مصوّر.\nالمحترف: سارة خان (CR-7K4Q2)',
    )
  })
})

describe('formatBriefDate', () => {
  it('formats in English and Arabic with Western digits', () => {
    expect(formatBriefDate('2026-11-21', 'en')).toBe('Sat 21 Nov')
    const ar = formatBriefDate('2026-11-21', 'ar')
    expect(ar).toContain('21')
    expect(ar).not.toMatch(/[٠-٩]/)
  })
})
