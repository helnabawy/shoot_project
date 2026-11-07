import { describe, expect, it } from 'vitest'
import { REFERENCE_ALPHABET } from '../brief/reference'
import { formatCreatorCode, generateCreatorCode, normaliseCode } from './code'

describe('CP-FR-007 creator code', () => {
  it('generates 5 characters from the unambiguous alphabet, with no prefix', () => {
    const code = generateCreatorCode()
    expect(code).toHaveLength(5)
    for (const ch of code) expect(REFERENCE_ALPHABET).toContain(ch)
    expect(REFERENCE_ALPHABET).not.toMatch(/[01OIL]/)
  })

  it('is deterministic for a given random source and covers both ends of the alphabet', () => {
    expect(generateCreatorCode(() => 0)).toBe('22222')
    expect(generateCreatorCode(() => 0.999999)).toBe('ZZZZZ')
  })

  it('formats with an upper-cased 2–4 letter prefix', () => {
    expect(formatCreatorCode('cr', '7K4Q2')).toBe('CR-7K4Q2')
    expect(formatCreatorCode('SHOT', '7k4q2')).toBe('SHOT-7K4Q2')
  })

  it.each(['', 'C', 'CRXYZ', 'C1', 'C-', 'ع'])('rejects the prefix %j', (prefix) => {
    expect(() => formatCreatorCode(prefix, '7K4Q2')).toThrow()
  })

  it('normalises any spelling of a code to the stored form', () => {
    for (const input of ['7K4Q2', '7k4q2', 'cr-7k4q2', ' XY-7k4q2 ', 'SHOT-7K4Q2']) {
      expect(normaliseCode(input), input).toBe('7K4Q2')
    }
  })

  it.each(['', '7K4Q', '7K4Q22', '7K4Q0', '7K4QO', '7K4QI', '7K4Q1', '-7K4Q2', 'CR-', 'CR-7K4Q', '7K4Q2-', 'CR-AB-7K4Q2', '7K 4Q2'])(
    'rejects %j (look-alikes are not substituted)',
    (input) => {
      expect(normaliseCode(input)).toBeNull()
    },
  )
})
