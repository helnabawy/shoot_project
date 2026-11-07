import { describe, expect, it } from 'vitest'
import { buildWhatsAppLink, isE164, normaliseE164, whatsappNumberSchema } from './whatsapp'

describe('FR-012 WhatsApp number normalisation', () => {
  it.each([
    ['+971 58 149 8824', '+971581498824'],
    ['00971-58-149-8824', '+971581498824'],
    ['+971 (58) 149.8824', '+971581498824'],
    ['  +44 20 7946 0958 ', '+442079460958'],
  ])('normalises %s', (input, expected) => {
    expect(normaliseE164(input)).toBe(expected)
  })

  it.each([
    ['0581498824', 'local number without country code'],
    ['+97158', 'too short'],
    ['+1234567890123456', 'too long'],
    ['+97158abc4988', 'letters'],
    ['+0581498824', 'country code cannot start with 0'],
    ['', 'empty'],
  ])('rejects %s (%s)', (input) => {
    expect(normaliseE164(input)).toBeNull()
    expect(isE164(input)).toBe(false)
  })

  it('isE164 rejects non-strings', () => {
    expect(isE164(971581498824)).toBe(false)
    expect(isE164(undefined)).toBe(false)
  })

  it('schema returns the normalised number', () => {
    expect(whatsappNumberSchema.parse('00971 58 149 8824')).toBe('+971581498824')
  })

  it('schema reports a translatable error key', () => {
    const result = whatsappNumberSchema.safeParse('0581498824')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('contact.errors.whatsappFormat')
  })
})

describe('FR-010 WhatsApp link builder', () => {
  it('US2-S1 builds a wa.me link with digits only', () => {
    expect(buildWhatsAppLink('+971 58 149 8824')).toBe('https://wa.me/971581498824')
  })

  it('encodes the pre-filled message', () => {
    expect(buildWhatsAppLink('+971581498824', 'Hi! Need a photographer & editor?')).toBe(
      'https://wa.me/971581498824?text=Hi!%20Need%20a%20photographer%20%26%20editor%3F',
    )
  })

  it('encodes Arabic text', () => {
    const link = buildWhatsAppLink('+971581498824', 'مرحبا')
    expect(decodeURIComponent(link.split('?text=')[1] ?? '')).toBe('مرحبا')
  })

  it('throws on an invalid number', () => {
    expect(() => buildWhatsAppLink('12345')).toThrow(/Invalid WhatsApp number/)
  })
})
