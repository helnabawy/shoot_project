import { describe, expect, it } from 'vitest'
import { applyPromo, normalisePromoCode, validatePromo } from './promo'
import type { PromoRule } from './types'

const now = new Date('2026-11-07T10:00:00Z')
const rule = (over: Partial<PromoRule> = {}): PromoRule => ({ code: 'WELCOME20', kind: 'percent', value: 20, usedCount: 0, active: true, ...over })

describe('QM-US2-S2 promo codes', () => {
  it.each([
    [' welcome20 ', 'WELCOME20'],
    ['abc', 'ABC'],
    ['ab', null],
    ['WELCOME-20', null],
    ['x'.repeat(21), null],
    ['', null],
  ])('normalisePromoCode(%j) → %j', (input, expected) => {
    expect(normalisePromoCode(input)).toBe(expected)
  })

  it('accepts an active code inside its window and under its limit', () => {
    expect(validatePromo(rule({ startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-12-31T00:00:00Z', usageLimit: 5, usedCount: 4 }), now)).toEqual({ ok: true })
    expect(validatePromo(rule({ startsAt: null, endsAt: null, usageLimit: null }), now)).toEqual({ ok: true })
  })

  it('applies a percentage, rounding to whole fils', () => {
    expect(applyPromo(50000, rule())).toBe(10000)
    expect(applyPromo(333, rule({ value: 50 }))).toBe(167)
  })

  it('caps a fixed discount at the subtotal', () => {
    expect(applyPromo(50000, rule({ kind: 'fixed', value: 10000 }))).toBe(10000)
    expect(applyPromo(5000, rule({ kind: 'fixed', value: 10000 }))).toBe(5000)
  })
})

describe('QM-US2-S4 unusable promo codes are refused with a reason', () => {
  it.each([
    ['unknown', null],
    ['inactive', rule({ active: false })],
    ['invalid', rule({ value: 120 })],
    ['invalid', rule({ value: 0 })],
    ['invalid', rule({ kind: 'fixed', value: -5 })],
    ['not-started', rule({ startsAt: '2026-12-01T00:00:00Z' })],
    ['expired', rule({ endsAt: '2026-11-01T00:00:00Z' })],
    ['used-up', rule({ usageLimit: 3, usedCount: 3 })],
  ] as const)('%s', (reason, value) => {
    expect(validatePromo(value, now)).toEqual({ ok: false, reason })
  })
})
