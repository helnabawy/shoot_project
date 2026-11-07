import { describe, expect, it } from 'vitest'
import { detailsSchema, reportSchema, respondSchema } from './schemas'

describe('QM-US2-S1 step 3 details', () => {
  it('normalises the WhatsApp number and trims', () => {
    const r = detailsSchema.parse({ name: ' Sara ', whatsapp: '00971 50 123 4567', date: '', promo: ' ' })
    expect(r).toEqual({ name: 'Sara', whatsapp: '+971501234567', date: undefined, addOnIds: [], promo: undefined })
  })

  it.each([
    [{ name: 'S', whatsapp: '+971501234567' }, 'booking.errors.name'],
    [{ name: 'Sara', whatsapp: '0501' }, 'contact.errors.whatsappFormat'],
    [{ name: 'Sara', whatsapp: '+971501234567', date: '2026-02-30' }, 'booking.errors.date'],
  ])('rejects %j', (input, message) => {
    const r = detailsSchema.safeParse(input)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe(message)
  })

  it('accepts a date and add-ons', () => {
    expect(detailsSchema.parse({ name: 'Sara', whatsapp: '+971501234567', date: '2026-12-10', addOnIds: ['1'], promo: 'W20' })).toMatchObject({ date: '2026-12-10', addOnIds: ['1'], promo: 'W20' })
  })

  it('respond and report forms', () => {
    expect(respondSchema.parse({ decision: 'decline', reason: ' busy ' })).toEqual({ decision: 'decline', reason: 'busy' })
    expect(respondSchema.safeParse({ decision: 'maybe' }).success).toBe(false)
    expect(reportSchema.safeParse({ reason: 'bad' }).success).toBe(false)
    expect(reportSchema.parse({ reason: 'Photos are missing' }).reason).toBe('Photos are missing')
  })
})
