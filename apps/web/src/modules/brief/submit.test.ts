import { describe, expect, it } from 'vitest'
import { briefBuilderFixture } from '../../../tests/fixtures/brief-builder'
import { chosenPersonas, composeMessage, composeSentence, parseBrief, readSlotValues } from './submit'

const form = (entries: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(entries)) data.set(k, v)
  return data
}

describe('brief submission parsing', () => {
  const config = briefBuilderFixture('en', ['photographer', 'videographer'])

  it('FR-049 resolves labels for the sentence and the WhatsApp message', () => {
    const result = parseBrief(config, form({ persona: 'photographer', occasion: 'wedding', duration: '2h', location: 'dubai', date: '' }), { today: '2026-11-07' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.personaSlugs).toEqual(['photographer'])
    expect(result.brief.date).toBeNull()
    // The stored sentence matches what the visitor saw: the unset optional date is left out.
    expect(composeSentence(config, result.brief.labels, result.brief.values)).toBe('I need a photographer for a wedding for 2 hours in Dubai.')
    expect(composeSentence(config, result.brief.labels, { ...result.brief.values, date: '2099-01-02' })).toContain('on any date')
    expect(composeMessage(config, result.brief.labels)).toBe('Hi! I need a photographer for a wedding.')
  })

  it('formats a chosen date in the page language', () => {
    const result = parseBrief(config, form({ persona: 'photographer', occasion: 'event', duration: '1h', location: 'sharjah', date: '2026-11-21' }), { today: '2026-11-07' })
    expect(result.ok && result.brief.labels.date).toBe('Sat 21 Nov')
    expect(result.ok && result.brief.date).toBe('2026-11-21')
  })

  it("uses the visitor's own words where the slot allows it", () => {
    const values = readSlotValues(config, form({ occasion: '__custom', occasion__custom: 'a graduation' }))
    expect(values.values.occasion).toBe('a graduation')
    expect(values.custom.occasion).toBe(true)
    const result = parseBrief(config, form({ persona: 'photographer', occasion: '__custom', occasion__custom: 'a graduation', duration: '2h', location: 'dubai' }), { today: '2026-11-07' })
    expect(result.ok && result.brief.labels.occasion).toBe('a graduation')
  })

  it('ignores typed words for slots that do not allow them', () => {
    const values = readSlotValues(config, form({ duration: '__custom', duration__custom: 'all day' }))
    expect(values.values.duration).toBe('')
  })

  it('FR-048 rejects an option that the chosen persona does not offer', () => {
    const result = parseBrief(config, form({ persona: 'photographer', occasion: 'drone', duration: '2h', location: 'dubai' }), { today: '2026-11-07' })
    expect(result).toEqual({ ok: false, errors: { occasion: 'brief.errors.notAnOption' } })
  })

  it('reports each invalid slot once', () => {
    const result = parseBrief(config, form({ persona: 'nobody', occasion: '', duration: '', location: '', date: '2020-01-01' }), { today: '2026-11-07' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual({
      persona: 'brief.errors.notAnOption',
      occasion: 'brief.errors.required',
      duration: 'brief.errors.required',
      location: 'brief.errors.required',
      date: 'brief.errors.datePast',
    })
  })
})

describe('FR-063 several professional types in one brief', () => {
  const config = briefBuilderFixture('en', ['photographer', 'videographer'], { multiple: true })
  const multiForm = (personas: string[], extra: Record<string, string> = {}) => {
    const data = form({ occasion: 'event', duration: '2h', location: 'dubai', ...extra })
    for (const p of personas) data.append('persona', p)
    return data
  }

  it('US8-S10 reads every ticked persona and joins them with "and" in the sentence and message', () => {
    const result = parseBrief(config, multiForm(['photographer', 'videographer']), { today: '2026-11-07' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.brief.personaSlugs).toEqual(['photographer', 'videographer'])
    expect(result.brief.values.persona).toBe('photographer,videographer')
    expect(composeSentence(config, result.brief.labels, result.brief.values)).toBe('I need a photographer and videographer for an event for 2 hours in Dubai.')
    expect(composeMessage(config, result.brief.labels)).toBe('Hi! I need a photographer and videographer for an event.')
  })

  it('joins with the Arabic "و" on the Arabic site', () => {
    const ar = briefBuilderFixture('ar', ['photographer', 'videographer'], { multiple: true })
    const result = parseBrief(ar, multiForm(['photographer', 'videographer']), { today: '2026-11-07' })
    expect(result.ok && result.brief.labels.persona).toBe('مصوّر ومصوّر فيديو')
  })

  it('accepts an option of either persona and still rejects one neither offers', () => {
    expect(parseBrief(config, multiForm(['photographer', 'videographer'], { occasion: 'drone' }), { today: '2026-11-07' }).ok).toBe(true)
    expect(parseBrief(config, multiForm(['photographer', 'videographer'], { occasion: 'maths' }), { today: '2026-11-07' })).toEqual({
      ok: false,
      errors: { occasion: 'brief.errors.notAnOption' },
    })
  })

  it('requires at least one persona and rejects an inactive one', () => {
    expect(parseBrief(config, multiForm([]), { today: '2026-11-07' })).toEqual({ ok: false, errors: { persona: 'brief.errors.required' } })
    expect(parseBrief(config, multiForm(['photographer', 'teacher']), { today: '2026-11-07' })).toEqual({
      ok: false,
      errors: { persona: 'brief.errors.notAnOption' },
    })
  })

  it('lists chosen personas for single and multiple slots alike', () => {
    expect(chosenPersonas(config, { persona: 'videographer,photographer' })).toEqual(['videographer', 'photographer'])
    expect(chosenPersonas(briefBuilderFixture(), { persona: 'videographer' })).toEqual(['videographer'])
    expect(chosenPersonas(briefBuilderFixture(), {})).toEqual([])
    expect(chosenPersonas({ ...config, slots: config.slots.filter((s) => s.kind !== 'persona') }, {})).toEqual([])
  })
})
