import { describe, expect, it } from 'vitest'
import { pushText } from './push-text'

describe('BI-US4-S7 push text never carries contact details', () => {
  it('drops phone numbers and email addresses', () => {
    expect(pushText('Call +971 50 123 4567 or mail layla@example.com today', 'body')).toBe('Call or mail today')
    expect(pushText('Sara said yes to your brief for an event', 'body')).toBe('Sara said yes to your brief for an event')
  })

  it('keeps titles and bodies short', () => {
    expect(pushText('x'.repeat(100), 'title')).toHaveLength(65)
    expect(pushText('y'.repeat(300), 'body').endsWith('…')).toBe(true)
  })

  it('keeps dates and short numbers', () => {
    expect(pushText('New brief: Photographer in Dubai, Fri 20 Nov 2026', 'body')).toBe('New brief: Photographer in Dubai, Fri 20 Nov 2026')
  })
})
