import { describe, expect, it } from 'vitest'
import { briefFingerprint } from './fingerprint'
import { generateBriefReference, isBriefReference } from './reference'

describe('FR-050 duplicate detection fingerprint', () => {
  const a = [
    { token: 'persona', value: '1' },
    { token: 'occasion', value: 'Event' },
  ]

  it('is stable regardless of selection order, case and whitespace', () => {
    const b = [
      { token: 'occasion', value: ' event ' },
      { token: 'persona', value: '1' },
    ]
    expect(briefFingerprint(a, 'v1')).toBe(briefFingerprint(b, 'v1'))
    expect(briefFingerprint(a, 'v1')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('differs per visitor and per selection', () => {
    expect(briefFingerprint(a, 'v1')).not.toBe(briefFingerprint(a, 'v2'))
    expect(briefFingerprint(a, 'v1')).not.toBe(briefFingerprint([{ token: 'persona', value: '2' }], 'v1'))
  })
})

describe('FR-059 brief reference', () => {
  it('generates short unambiguous references', () => {
    for (let i = 0; i < 200; i += 1) {
      const ref = generateBriefReference()
      expect(isBriefReference(ref)).toBe(true)
      expect(ref).not.toMatch(/[01OIL]/)
    }
  })

  it('is deterministic for a given random source', () => {
    expect(generateBriefReference(() => 0)).toBe('B-22222')
    expect(generateBriefReference(() => 0.9999)).toBe('B-ZZZZZ')
  })

  it('rejects malformed references', () => {
    expect(isBriefReference('B-OOOOO')).toBe(false)
    expect(isBriefReference('B-1234')).toBe(false)
  })
})
