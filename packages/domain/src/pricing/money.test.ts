import { describe, expect, it } from 'vitest'
import { CURRENCY, fils, formatMoney, sumAmounts, toAed } from './money'

describe('QM-FR-009 money in integer fils', () => {
  it.each([
    [0, 0],
    [1, 100],
    [12.345, 1235],
    [800, 80000],
    [0.005, 1],
  ])('fils(%s) → %s (half-up, integer)', (aed, expected) => {
    expect(fils(aed)).toBe(expected)
  })

  it('toAed is the inverse for the admin form', () => {
    expect(toAed(80050)).toBe(800.5)
    expect(fils(toAed(123456))).toBe(123456)
  })

  it('currency is AED', () => {
    expect(CURRENCY).toBe('AED')
  })

  it('formats whole amounts without decimals and fractional amounts with two', () => {
    expect(formatMoney(50000, 'en')).toMatch(/^AED\s500$/u)
    expect(formatMoney(12345, 'en')).toContain('123.45')
    expect(formatMoney(12345, 'en')).toContain('AED')
  })

  it('formats in Arabic with the Arabic currency sign', () => {
    const ar = formatMoney(50000, 'ar')
    expect(ar).toContain('500')
    expect(ar).toContain('د.إ')
    expect(ar).not.toBe(formatMoney(50000, 'en'))
  })

  it('keeps the sign of negative amounts', () => {
    expect(formatMoney(-10000, 'en')).toMatch(/-.*100|100.*-/)
  })

  it('sums line amounts', () => {
    expect(sumAmounts([{ amount: 100 }, { amount: -40 }, { amount: 5 }])).toBe(65)
    expect(sumAmounts([])).toBe(0)
  })
})
