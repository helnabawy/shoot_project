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

describe('formatBriefDate', () => {
  it('formats in English and Arabic with Western digits', () => {
    expect(formatBriefDate('2026-11-21', 'en')).toBe('Sat 21 Nov')
    const ar = formatBriefDate('2026-11-21', 'ar')
    expect(ar).toContain('21')
    expect(ar).not.toMatch(/[٠-٩]/)
  })
})
