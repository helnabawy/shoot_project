import { describe, expect, it } from 'vitest'
import { clientAddressOf, negotiateLocale, readInstallId, requestIdOf, visitorKeyOf } from './negotiate'

describe('MR-US1-S3 negotiateLocale', () => {
  it('an explicit ?locale= wins over the header', () => {
    expect(negotiateLocale('ar', 'en')).toEqual({ locale: 'ar', invalid: false })
    expect(negotiateLocale('en', 'ar')).toEqual({ locale: 'en', invalid: false })
  })

  it('an unsupported ?locale= is invalid and the header decides the answer language', () => {
    expect(negotiateLocale('fr', 'ar')).toEqual({ locale: 'ar', invalid: true })
    expect(negotiateLocale(['ar', 'en'], null)).toEqual({ locale: 'en', invalid: true })
    expect(negotiateLocale('', null)).toEqual({ locale: 'en', invalid: true })
  })

  it('reads Accept-Language by weight and primary subtag', () => {
    expect(negotiateLocale(undefined, 'fr;q=1, ar;q=0.8').locale).toBe('ar')
    expect(negotiateLocale(undefined, 'ar-AE').locale).toBe('ar')
    expect(negotiateLocale(undefined, 'en;q=0.4, AR;q=0.9').locale).toBe('ar')
    expect(negotiateLocale(undefined, 'ar;q=0, en;q=0.1').locale).toBe('en')
    expect(negotiateLocale(undefined, 'ar, en').locale).toBe('ar')
    expect(negotiateLocale(undefined, '*, ar;q=0.5').locale).toBe('ar')
    expect(negotiateLocale(undefined, 'ar;q=abc').locale).toBe('ar')
  })

  it('falls back to English', () => {
    expect(negotiateLocale(undefined, 'de')).toEqual({ locale: 'en', invalid: false })
    expect(negotiateLocale(undefined, null)).toEqual({ locale: 'en', invalid: false })
    expect(negotiateLocale(undefined, '')).toEqual({ locale: 'en', invalid: false })
  })
})

describe('MR-US2-S8 install id and visitor key', () => {
  const hex = '0123456789abcdef0123456789abcdef'

  it('accepts 32 lower-case hex characters only', () => {
    expect(readInstallId(hex)).toBe(hex)
    expect(readInstallId(hex.toUpperCase())).toBeNull()
    expect(readInstallId(hex.slice(1))).toBeNull()
    expect(readInstallId(`${hex.slice(1)}g`)).toBeNull()
    expect(readInstallId(null)).toBeNull()
  })

  it('reads the client address from x-forwarded-for, then x-real-ip', () => {
    expect(clientAddressOf(new Headers({ 'x-forwarded-for': ' 1.1.1.1 , 2.2.2.2', 'x-real-ip': '3.3.3.3' }))).toBe('1.1.1.1')
    expect(clientAddressOf(new Headers({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3')
    expect(clientAddressOf(new Headers({ 'x-forwarded-for': ' ' }))).toBeNull()
    expect(clientAddressOf(new Headers())).toBeNull()
  })

  it('counts per install id, else per address, else anonymous', () => {
    expect(visitorKeyOf(hex, '1.1.1.1')).toBe(`install:${hex}`)
    expect(visitorKeyOf(null, '1.1.1.1')).toBe('1.1.1.1')
    expect(visitorKeyOf(null, null)).toBe('anonymous')
  })

  it('keeps the client address whether or not an install id is sent (009 limits per address)', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1', 'x-shoot-install': hex })
    expect(clientAddressOf(headers)).toBe('1.1.1.1')
  })
})

describe('requestIdOf', () => {
  it('echoes a valid id and generates one otherwise', () => {
    expect(requestIdOf('req-12345678')).toBe('req-12345678')
    for (const bad of [null, 'short', 'has space in it', 'x'.repeat(65)]) {
      const id = requestIdOf(bad)
      expect(id).not.toBe(bad)
      expect(id).toMatch(/^[\w-]{8,64}$/)
    }
  })
})
