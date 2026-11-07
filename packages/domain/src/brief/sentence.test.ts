import { describe, expect, it } from 'vitest'
import { checkSentenceSlots, parseSentence, sentenceTokens, joinSentence, omitTokens } from './sentence'

const SENTENCE = 'I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.'

describe('FR-046 sentence parsing', () => {
  it('splits text and tokens in order', () => {
    expect(parseSentence('I need a {persona} in {location}.')).toEqual([
      { type: 'text', value: 'I need a ' },
      { type: 'token', name: 'persona', known: true },
      { type: 'text', value: ' in ' },
      { type: 'token', name: 'location', known: true },
      { type: 'text', value: '.' },
    ])
  })

  it('flags tokens without a slot definition', () => {
    const parts = parseSentence('{persona} for {subject}', ['persona'])
    expect(parts).toEqual([
      { type: 'token', name: 'persona', known: true },
      { type: 'text', value: ' for ' },
      { type: 'token', name: 'subject', known: false },
    ])
  })

  it('treats malformed braces as text', () => {
    expect(parseSentence('{ persona } and {1x}')).toEqual([{ type: 'text', value: '{ persona } and {1x}' }])
  })

  it('lists tokens once in order', () => {
    expect(sentenceTokens(SENTENCE)).toEqual(['persona', 'occasion', 'date', 'duration', 'location', 'shotBy'])
    expect(sentenceTokens('{a} {b} {a}')).toEqual(['a', 'b'])
  })

  it('US8-S6 reports missing and unused slots', () => {
    expect(checkSentenceSlots(SENTENCE, ['persona', 'occasion', 'date', 'duration', 'location', 'shotBy'])).toEqual({
      missingSlots: [],
      unusedSlots: [],
    })
    expect(checkSentenceSlots('{persona} {subject}', ['persona', 'location'])).toEqual({
      missingSlots: ['subject'],
      unusedSlots: ['location'],
    })
  })
})

describe('omitTokens', () => {
  const en = 'I need a {persona} for {occasion} on {date} for {duration}, shot by {shotBy}.'
  const prune = (template: string, names: string[]) => joinSentence(omitTokens(parseSentence(template), (n) => names.includes(n)))

  it('FR-046 drops an unset part with its joining word', () => {
    expect(prune(en, ['date'])).toBe('I need a {persona} for {occasion} for {duration}, shot by {shotBy}.')
  })

  it('keeps leading punctuation but never leaves it dangling before a full stop', () => {
    expect(prune(en, ['shotBy'])).toBe('I need a {persona} for {occasion} on {date} for {duration}.')
  })

  it('works for Arabic joiners and a token at the start', () => {
    expect(prune('أحتاج {persona} من أجل {occasion} بتاريخ {date} لمدة {duration}', ['date'])).toBe('أحتاج {persona} من أجل {occasion} لمدة {duration}')
    expect(prune('{date} please', ['date'])).toBe(' please')
    expect(prune('{a}, then {b}, and {c}', ['b'])).toBe('{a}, and {c}')
  })

  it('leaves the sentence alone when nothing is omitted', () => {
    expect(prune(en, [])).toBe(en)
  })
})
