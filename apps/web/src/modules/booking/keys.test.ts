import { beforeAll, describe, expect, it } from 'vitest'
import { accessKey, keyMatches, newSalt } from './keys'

describe('QM-FR-011 private links', () => {
  beforeAll(() => {
    process.env.PAYLOAD_SECRET = 'unit-test-secret-unit-test-secret'
  })

  it('salts are random and keys are 43 url-safe characters', () => {
    const a = newSalt()
    expect(a).not.toBe(newSalt())
    expect(accessKey(a, 'booking')).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('a key is stable for its salt and purpose and differs otherwise', () => {
    const salt = newSalt()
    expect(accessKey(salt, 'booking')).toBe(accessKey(salt, 'booking'))
    expect(accessKey(salt, 'brief')).not.toBe(accessKey(salt, 'booking'))
    expect(accessKey(newSalt(), 'booking')).not.toBe(accessKey(salt, 'booking'))
  })

  it('keyMatches accepts only the right key', () => {
    const salt = newSalt()
    const key = accessKey(salt, 'brief')
    expect(keyMatches(key, salt, 'brief')).toBe(true)
    expect(keyMatches(key, salt, 'booking')).toBe(false)
    expect(keyMatches(accessKey(newSalt(), 'brief'), salt, 'brief')).toBe(false)
    expect(keyMatches('', salt, 'brief')).toBe(false)
    expect(keyMatches(key, null, 'brief')).toBe(false)
    expect(keyMatches('not a key', salt, 'brief')).toBe(false)
    expect(keyMatches(`${key.slice(0, 42)}!`, salt, 'brief')).toBe(false)
  })

  it('refuses to run without the server secret', () => {
    const saved = process.env.PAYLOAD_SECRET
    delete process.env.PAYLOAD_SECRET
    expect(() => accessKey('x', 'brief')).toThrow(/PAYLOAD_SECRET/)
    process.env.PAYLOAD_SECRET = saved
  })
})
