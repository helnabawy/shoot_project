import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV = {
  DATABASE_URI: 'postgres://x@127.0.0.1/x',
  PAYLOAD_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  PREVIEW_SECRET: 'p'.repeat(16),
  CRON_SECRET: 'c'.repeat(16),
}

async function load(secret: string | undefined) {
  vi.resetModules()
  vi.stubEnv('OTP_HMAC_SECRET', secret ?? '')
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
  return import('./codes')
}

describe('OT-US2-S3 codes and fingerprints', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'timingSafeEqual')
    vi.spyOn(crypto, 'randomInt')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('generateCode returns six digits from crypto.randomInt', async () => {
    const { generateCode } = await load('a'.repeat(32))
    vi.mocked(crypto.randomInt).mockImplementationOnce((() => 42) as never)
    expect(generateCode()).toBe('000042')
    expect(crypto.randomInt).toHaveBeenCalledWith(0, 1_000_000)
    expect(generateCode()).toMatch(/^\d{6}$/)
  })

  it('codeHash and phoneHash are keyed and bound to the challenge', async () => {
    const a = await load('a'.repeat(32))
    const codeA = a.codeHash('c1', '482713')
    const phoneA = a.phoneHash('+971501234567')
    expect(codeA).toMatch(/^[0-9a-f]{64}$/)
    expect(codeA).not.toContain('482713')
    expect(a.codeHash('c2', '482713')).not.toBe(codeA)
    expect(phoneA).not.toBe(a.phoneHash('+971501234568'))
    const b = await load('b'.repeat(32))
    expect(b.codeHash('c1', '482713')).not.toBe(codeA)
    expect(b.phoneHash('+971501234567')).not.toBe(phoneA)
  })

  it('codesMatch uses timingSafeEqual for right, wrong and malformed input', async () => {
    const { codeHash, codesMatch } = await load('a'.repeat(32))
    const stored = codeHash('c1', '482713')
    expect(codesMatch(stored, 'c1', '482713')).toBe(true)
    expect(codesMatch(stored, 'c1', '482714')).toBe(false)
    expect(codesMatch(stored, 'c1', '48271')).toBe(false)
    expect(codesMatch(stored, 'c1', '000000')).toBe(false)
    expect(codesMatch('broken', 'c1', '482713')).toBe(false)
    expect(crypto.timingSafeEqual).toHaveBeenCalledTimes(5)
  })

  it('digestsEqual compares two digests in constant time', async () => {
    const { digestsEqual, phoneHash } = await load('a'.repeat(32))
    expect(digestsEqual(phoneHash('+971501234567'), phoneHash('+971501234567'))).toBe(true)
    expect(digestsEqual(phoneHash('+971501234567'), phoneHash('+971501234568'))).toBe(false)
    expect(digestsEqual('short', phoneHash('+971501234567'))).toBe(false)
  })

  it('refuses to work without the secret', async () => {
    const { phoneHash } = await load(undefined)
    expect(() => phoneHash('+971501234567')).toThrow(/OTP_HMAC_SECRET is not set/)
  })
})
