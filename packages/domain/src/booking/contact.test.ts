import { describe, expect, it } from 'vitest'
import { CONFIRMED_STATES, contactNumber, creatorSeesClient, formatPhone, isConfirmedBooking, sharesContact } from './contact'
import { BOOKING_STATES } from './states'

describe('BC-US1-S1 the client sees the booked creators from Paid until delivery', () => {
  it.each(['paid', 'scheduled', 'delivered'] as const)('%s shares contact', (state) => {
    expect(sharesContact(state)).toBe(true)
  })
})

describe('BC-US1-S2 no contact before a booking is paid or once it is over', () => {
  it.each(['quoted', 'accepted', 'confirmed', 'completed', 'cancelled', 'expired', 'on-hold'] as const)('%s shares nothing', (state) => {
    expect(sharesContact(state)).toBe(false)
  })
})

describe('BC-US2-S1 a creator whose part is confirmed sees the client', () => {
  it('in every sharing state', () => {
    for (const state of ['paid', 'scheduled', 'delivered'] as const) expect(creatorSeesClient(state, 'confirmed')).toBe(true)
    expect(creatorSeesClient('confirmed', 'confirmed')).toBe(false)
  })
})

describe('BC-US2-S2 not before the creator said yes, and not outside the sharing states', () => {
  it.each(['open', 'pending', 'declined', 'lapsed'] as const)('an assignment that is %s sees nothing', (status) => {
    expect(creatorSeesClient('paid', status)).toBe(false)
  })

  it('a confirmed part of a booking that is not shared sees nothing', () => {
    for (const state of BOOKING_STATES.filter((s) => !sharesContact(s))) expect(creatorSeesClient(state, 'confirmed')).toBe(false)
  })
})

describe('BC-US3-S3 which bookings are listed as Confirmed', () => {
  it('confirmed, paid and scheduled', () => {
    expect(BOOKING_STATES.filter(isConfirmedBooking)).toEqual([...CONFIRMED_STATES])
    expect(isConfirmedBooking('delivered')).toBe(false)
    expect(isConfirmedBooking('accepted')).toBe(false)
  })
})

describe('BC-US1-S1 a number is grouped for reading', () => {
  it('a UAE mobile', () => {
    expect(formatPhone('+971501234567')).toBe('+971 50 123 4567')
    expect(formatPhone('00971 50 123 4567')).toBe('+971 50 123 4567')
  })

  it('another country', () => {
    expect(formatPhone('+442079460958')).toBe('+44207 946 0958')
  })

  it('nothing for no number or a value that is not one', () => {
    expect(formatPhone(null)).toBeNull()
    expect(formatPhone('')).toBeNull()
    expect(formatPhone('editor@example.com')).toBeNull()
  })

  it('a contact carries the E.164 number and its display form', () => {
    expect(contactNumber('+971501234567')).toEqual({ phone: '+971501234567', display: '+971 50 123 4567' })
    expect(contactNumber('editor@example.com')).toBeNull()
    expect(contactNumber(undefined)).toBeNull()
  })
})
