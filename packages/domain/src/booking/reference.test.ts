import { describe, expect, it } from 'vitest'
import { generateQuoteReference, isQuoteReference, normaliseQuoteReference } from './reference'

describe('QM-US2-S1 quotation references', () => {
  it('is deterministic for a given random source', () => {
    expect(generateQuoteReference(() => 0)).toBe('Q-22222')
    expect(generateQuoteReference(() => 0.9999)).toBe('Q-ZZZZZ')
  })

  it('never uses look-alike characters', () => {
    for (let i = 0; i < 200; i += 1) {
      const ref = generateQuoteReference()
      expect(isQuoteReference(ref)).toBe(true)
      expect(ref.slice(2)).not.toMatch(/[01OIL]/)
    }
  })

  it.each([
    ['q-7k4q2', 'Q-7K4Q2'],
    [' Q-7K4Q2 ', 'Q-7K4Q2'],
    ['Q-7K4Q', null],
    ['Q-7K4Q22', null],
    ['B-7K4Q2', null],
    ['Q-7K4Q0', null],
  ])('normalise %j → %j', (input, expected) => {
    expect(normaliseQuoteReference(input)).toBe(expected)
  })
})
