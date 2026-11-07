import { describe, expect, it } from 'vitest'
import { heldAmount, paymentAllowed } from './payments'

describe('QM-FR-007 payments are recorded by hand', () => {
  it('held = received − payouts − refunds', () => {
    expect(heldAmount([])).toBe(0)
    expect(heldAmount([{ kind: 'received', amount: 80000 }])).toBe(80000)
    expect(heldAmount([{ kind: 'received', amount: 80000 }, { kind: 'payout', amount: 60000 }, { kind: 'refund', amount: 20000 }])).toBe(0)
  })

  it.each([
    ['received', 'confirmed', true],
    ['received', 'paid', false],
    ['payout', 'completed', true],
    ['payout', 'delivered', false],
    ['refund', 'cancelled', true],
    ['refund', 'on-hold', true],
    ['refund', 'paid', false],
  ] as const)('%s in %s → %s', (kind, state, expected) => {
    expect(paymentAllowed(kind, state)).toBe(expected)
  })
})
