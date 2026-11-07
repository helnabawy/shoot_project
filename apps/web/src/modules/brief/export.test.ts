import { describe, expect, it } from 'vitest'
import { csvCell } from './export'

describe('brief CSV cells', () => {
  it('quotes, escapes and neutralises formulas', () => {
    expect(csvCell('I need a "photographer"')).toBe('"I need a ""photographer"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell(null)).toBe('""')
    expect(csvCell(42)).toBe('"42"')
  })
})
