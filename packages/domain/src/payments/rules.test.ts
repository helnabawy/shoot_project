import { describe, expect, it } from 'vitest'
import { filsToAed, onlinePaymentAllowed, paymentOutcome } from './rules'

describe('PY-US1-S6 online payment is offered only for a confirmed booking with something to pay', () => {
  it('confirmed with a total: allowed', () => {
    expect(onlinePaymentAllowed({ state: 'confirmed', totalFils: 155000 })).toBe(true)
  })

  it('any other state, or a zero total: not allowed', () => {
    for (const state of ['quoted', 'accepted', 'paid', 'scheduled', 'delivered', 'completed', 'cancelled', 'expired', 'on-hold']) {
      expect(onlinePaymentAllowed({ state, totalFils: 155000 })).toBe(false)
    }
    expect(onlinePaymentAllowed({ state: 'confirmed', totalFils: 0 })).toBe(false)
    expect(onlinePaymentAllowed({ state: 'confirmed', totalFils: null })).toBe(false)
  })
})

describe('PY-US3-S3 what an arriving payment does', () => {
  const booking = { state: 'confirmed', totalFils: 155000 }

  it('the booking total, in AED, on a confirmed booking: apply (the booking becomes paid)', () => {
    expect(paymentOutcome(booking, { amountFils: 155000, currency: 'aed' })).toEqual({ outcome: 'apply' })
    expect(paymentOutcome(booking, { amountFils: 155000, currency: 'AED' })).toEqual({ outcome: 'apply' })
  })

  it('a booking that no longer waits for payment: attention, state', () => {
    expect(paymentOutcome({ ...booking, state: 'paid' }, { amountFils: 155000, currency: 'aed' })).toEqual({ outcome: 'attention', reason: 'state' })
    expect(paymentOutcome({ ...booking, state: 'cancelled' }, { amountFils: 155000, currency: 'aed' })).toEqual({ outcome: 'attention', reason: 'state' })
  })

  it('another currency or another amount: attention', () => {
    expect(paymentOutcome(booking, { amountFils: 155000, currency: 'usd' })).toEqual({ outcome: 'attention', reason: 'currency' })
    expect(paymentOutcome(booking, { amountFils: 100000, currency: 'aed' })).toEqual({ outcome: 'attention', reason: 'amount' })
    expect(paymentOutcome({ ...booking, totalFils: null }, { amountFils: 155000, currency: 'aed' })).toEqual({ outcome: 'attention', reason: 'amount' })
  })
})

describe('fils and dirhams', () => {
  it('records the payment amount in AED with two decimals', () => {
    expect(filsToAed(155000)).toBe(1550)
    expect(filsToAed(1)).toBe(0.01)
    expect(filsToAed(99999)).toBe(999.99)
  })
})
