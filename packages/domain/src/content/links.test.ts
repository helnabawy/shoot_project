import { describe, expect, it } from 'vitest'
import { linkTarget, stripLocalePrefix } from './links'

describe('MR-US4-S2 linkTarget', () => {
  it('keeps site paths without their language prefix', () => {
    expect(linkTarget('/guides/x')).toBe('/guides/x')
    expect(linkTarget('/ar/guides/x')).toBe('/guides/x')
    expect(linkTarget('/en/guides/x')).toBe('/guides/x')
    expect(linkTarget(' /ar ')).toBe('/')
    expect(linkTarget('/arabic-weddings')).toBe('/arabic-weddings')
  })

  it('keeps web, mail and phone addresses', () => {
    expect(linkTarget('https://example.com/a')).toBe('https://example.com/a')
    expect(linkTarget('http://example.com')).toBe('http://example.com')
    expect(linkTarget('mailto:a@b.c')).toBe('mailto:a@b.c')
    expect(linkTarget('tel:+971500000000')).toBe('tel:+971500000000')
  })

  it('refuses everything else', () => {
    expect(linkTarget('javascript:alert(1)')).toBeNull()
    expect(linkTarget('data:text/html,x')).toBeNull()
    expect(linkTarget('//evil.example')).toBeNull()
    expect(linkTarget('/\\evil.example')).toBeNull()
    expect(linkTarget('')).toBeNull()
    expect(linkTarget('   ')).toBeNull()
    expect(linkTarget(null)).toBeNull()
    expect(linkTarget(undefined)).toBeNull()
    expect(linkTarget('guides/x')).toBeNull()
  })
})

describe('stripLocalePrefix', () => {
  it('removes only a whole language segment', () => {
    expect(stripLocalePrefix('/ar?x=1')).toBe('/?x=1')
    expect(stripLocalePrefix('/')).toBe('/')
    expect(stripLocalePrefix('/area')).toBe('/area')
  })
})
