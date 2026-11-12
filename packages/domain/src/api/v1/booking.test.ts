import { describe, expect, it } from 'vitest'
import { bookingViewV1, detailsV1, matchV1, quotationIssuedV1, reportRequestV1, START_TIME } from './booking'

const details = { date: '2026-12-12', startTime: '18:30', duration: '2h', venue: 'Dubai Marina' }

describe('MQ booking contract shapes', () => {
  it('MQ-US2-S4 accepts a complete details object and trims the venue', () => {
    expect(detailsV1.parse({ ...details, venue: '  Dubai Marina  ' }).venue).toBe('Dubai Marina')
  })

  it('MQ-US2-S4 names the field as a message key when a detail is missing or malformed', () => {
    const time = detailsV1.safeParse({ ...details, startTime: '25:00' })
    const venue = detailsV1.safeParse({ ...details, venue: '   ' })
    expect(time.error?.issues[0]?.message).toBe('booking.errors.startTime')
    expect(venue.error?.issues[0]?.message).toBe('booking.errors.venue')
    expect(detailsV1.safeParse({ ...details, note: 'x'.repeat(301) }).success).toBe(false)
  })

  it('reads 24-hour times only', () => {
    expect(['00:00', '09:05', '23:59'].every((t) => START_TIME.test(t))).toBe(true)
    expect(['24:00', '9:05', '12:60', ''].some((t) => START_TIME.test(t))).toBe(false)
  })

  it('MQ-US5-S3 a report needs 5 to 500 characters', () => {
    expect(reportRequestV1.shape.body.safeParse({ reason: 'bad' }).error?.issues[0]?.message).toBe('booking.errors.reason')
    expect(reportRequestV1.shape.body.safeParse({ reason: 'The photos never arrived' }).success).toBe(true)
  })

  it('MQ-US4-S6 no shape carries a phone number or a payment detail', () => {
    const keys = JSON.stringify([bookingViewV1.toJSONSchema?.() ?? Object.keys(bookingViewV1.shape), Object.keys(quotationIssuedV1.shape), Object.keys(matchV1.shape)])
    expect(keys).not.toMatch(/phone|whatsapp"|card|iban|payment/i)
  })
})
