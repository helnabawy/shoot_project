import { describe, expect, it } from 'vitest'
import { quotePrice } from './quote'
import type { PriceRules, QuoteInput } from './types'

const L = (en: string) => ({ en, ar: `${en} (ar)` })
const rules: PriceRules = {
  tiers: [
    { id: 't1', personaId: 'p', duration: '2h', price: 80000, title: L('2-hour photo shoot'), deliverables: { en: ['60 edited photos'], ar: ['60 صورة'] }, active: true },
    { id: 't2', personaId: 'v', duration: '2h', price: 100000, title: L('2-hour video shoot'), deliverables: { en: ['1 film'], ar: ['فيلم'] }, active: true },
    { id: 't3', personaId: 'p', duration: '4h', price: 140000, title: L('Old 4h'), deliverables: { en: [], ar: [] }, active: false },
  ],
  travelFees: [
    { location: 'dubai', fee: 0, active: true },
    { location: 'sharjah', fee: 5000, active: true },
    { location: 'ajman', fee: 7500, active: false },
  ],
  addOns: [
    { id: 'a1', title: L('Express delivery'), price: 20000, personaIds: [], active: true },
    { id: 'a2', title: L('Drone'), price: 30000, personaIds: ['v'], active: true },
    { id: 'a3', title: L('Retired'), price: 1000, personaIds: [], active: false },
  ],
}
const now = new Date('2026-11-07T10:00:00Z')
const input = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  personaIds: ['p'],
  duration: '2h',
  location: 'sharjah',
  labels: { travel: L('Travel'), discount: L('Code') },
  now,
  ...over,
})

describe('QM-FR-009 one price per brief from the price rules', () => {
  it('QM-US1-S4 one type: tier line + travel line, total is the sum', () => {
    const r = quotePrice(rules, input())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.lines.map((l) => [l.kind, l.amount, l.personaId])).toEqual([
      ['tier', 80000, 'p'],
      ['travel', 5000, 'p'],
    ])
    expect(r.lines[0]?.deliverables?.en).toEqual(['60 edited photos'])
    expect(r.lines[0]?.label.ar).toBe('2-hour photo shoot (ar)')
    expect(r).toMatchObject({ subtotal: 85000, discount: 0, total: 85000, currency: 'AED', promo: null })
  })

  it('omits a zero travel fee line', () => {
    const r = quotePrice(rules, input({ location: 'dubai' }))
    expect(r.ok && r.lines.map((l) => l.kind)).toEqual(['tier'])
  })

  it('several types: one tier and one travel line per type, in the brief order', () => {
    const r = quotePrice(rules, input({ personaIds: ['v', 'p'] }))
    expect(r.ok && r.lines.map((l) => `${l.kind}:${l.personaId}`)).toEqual(['tier:v', 'travel:v', 'tier:p', 'travel:p'])
    expect(r.ok && r.total).toBe(100000 + 5000 + 80000 + 5000)
  })

  it.each([
    ['no tier for the duration', input({ duration: '8h' }), 'no-tier'],
    ['inactive tier', input({ duration: '4h' }), 'no-tier'],
    ['one of several types has no tier', input({ personaIds: ['p', 'x'] }), 'no-tier'],
    ['no persona at all', input({ personaIds: [] }), 'no-tier'],
    ['no travel fee', input({ location: 'fujairah' }), 'no-travel-fee'],
    ['inactive travel fee', input({ location: 'ajman' }), 'no-travel-fee'],
    ['custom duration', input({ custom: { duration: true } }), 'custom-value'],
    ['custom location', input({ custom: { location: true } }), 'custom-value'],
  ] as const)('%s → %s', (_name, value, reason) => {
    expect(quotePrice(rules, value)).toEqual({ ok: false, reason })
  })

  it('adds active add-ons once, only those offered with a chosen type', () => {
    const r = quotePrice(rules, input({ addOnIds: ['a1', 'a1', 'a2', 'a3', 'missing'] }))
    expect(r.ok && r.lines.filter((l) => l.kind === 'addon').map((l) => l.amount)).toEqual([20000])
    const v = quotePrice(rules, input({ personaIds: ['v'], addOnIds: ['a2'] }))
    expect(v.ok && v.lines.filter((l) => l.kind === 'addon').map((l) => l.label.en)).toEqual(['Drone'])
  })

  it('QM-US2-S2 applies a valid promo after add-ons as one negative line', () => {
    const r = quotePrice(rules, input({ addOnIds: ['a1'], promo: { code: 'WELCOME20', rule: { code: 'WELCOME20', kind: 'percent', value: 20, usedCount: 0, active: true } } }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.subtotal).toBe(105000)
    expect(r.discount).toBe(21000)
    expect(r.total).toBe(84000)
    expect(r.lines.at(-1)).toMatchObject({ kind: 'discount', amount: -21000, label: { en: 'Code' } })
    expect(r.promo).toEqual({ code: 'WELCOME20', applied: true })
  })

  it('QM-US2-S4 an unusable promo is reported, not applied', () => {
    const r = quotePrice(rules, input({ promo: { code: 'NOPE', rule: null } }))
    expect(r.ok && r.promo).toEqual({ code: 'NOPE', applied: false, reason: 'unknown' })
    expect(r.ok && r.discount).toBe(0)
    expect(r.ok && r.lines.some((l) => l.kind === 'discount')).toBe(false)
  })

  it('a fixed promo larger than the subtotal brings the total to zero, never below', () => {
    const r = quotePrice(rules, input({ location: 'dubai', promo: { code: 'BIG', rule: { code: 'BIG', kind: 'fixed', value: 999999, usedCount: 0, active: true } } }))
    expect(r.ok && r.total).toBe(0)
  })
})
