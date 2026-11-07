import { describe, expect, it } from 'vitest'
import { isAllowedSocialUrl } from './links'

describe('CP-US3-S1 social links', () => {
  it.each([
    ['instagram', 'https://www.instagram.com/sara'],
    ['instagram', 'https://instagram.com/sara'],
    ['linkedin', 'https://www.linkedin.com/in/sara'],
    ['youtube', 'https://youtu.be/abc'],
    ['youtube', 'https://www.youtube.com/@sara'],
    ['tiktok', 'https://www.tiktok.com/@sara'],
    ['x', 'https://x.com/sara'],
    ['x', 'https://twitter.com/sara'],
    ['website', 'https://sara.example'],
  ] as const)('accepts %s %s', (platform, url) => {
    expect(isAllowedSocialUrl(platform, url)).toBe(true)
  })

  it.each([
    ['instagram', 'http://instagram.com/sara'],
    ['instagram', 'https://tiktok.com/@sara'],
    ['instagram', 'https://instagram.com.evil.com/sara'],
    ['instagram', 'https://notinstagram.com/sara'],
    ['website', 'http://sara.example'],
    ['website', 'ftp://sara.example'],
    ['website', 'not a url'],
    ['website', ''],
  ] as const)('rejects %s %j', (platform, url) => {
    expect(isAllowedSocialUrl(platform, url)).toBe(false)
  })
})
