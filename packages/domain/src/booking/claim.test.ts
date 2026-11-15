import { describe, expect, it } from 'vitest'
import { claimFor } from './claim'

describe('021 amendment: who may accept a quotation, and what becomes theirs', () => {
  it('BS-US8-S1 nobody signed in: refused, nothing claimed', () => {
    expect(claimFor({ bookingMember: null, briefMember: null, userId: null })).toEqual({ ok: false, reason: 'signInRequired' })
    expect(claimFor({ bookingMember: 7, briefMember: 7, userId: undefined })).toEqual({ ok: false, reason: 'signInRequired' })
  })

  it('BS-US7-S4 a guest quotation becomes the member’s, with its guest brief', () => {
    expect(claimFor({ bookingMember: null, briefMember: null, userId: 4 })).toEqual({ ok: true, claimBooking: true, claimBrief: true })
  })

  it('BS-US7-S4 a brief that already has a member keeps it; only the booking is claimed', () => {
    expect(claimFor({ bookingMember: null, briefMember: 9, userId: 4 })).toEqual({ ok: true, claimBooking: true, claimBrief: false })
  })

  it('BS-US7-S6 the member’s own booking: nothing to claim', () => {
    expect(claimFor({ bookingMember: 4, briefMember: 4, userId: 4 })).toEqual({ ok: true, claimBooking: false, claimBrief: false })
    expect(claimFor({ bookingMember: '4', briefMember: null, userId: 4 })).toEqual({ ok: true, claimBooking: false, claimBrief: true })
  })

  it('BS-US7-S5 another member’s booking is never taken over', () => {
    expect(claimFor({ bookingMember: 9, briefMember: null, userId: 4 })).toEqual({ ok: false, reason: 'otherAccount' })
  })
})
