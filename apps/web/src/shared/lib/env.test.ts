import { describe, expect, it } from 'vitest'
import { hasS3, parseEnv } from './env'

const valid = {
  DATABASE_URI: 'postgres://shoot:shoot@127.0.0.1:5432/shoot',
  PAYLOAD_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_SITE_URL: 'https://example.ae/',
  PREVIEW_SECRET: 'p'.repeat(16),
  CRON_SECRET: 'c'.repeat(16),
}

describe('environment validation', () => {
  it('accepts a minimal valid environment and trims the site URL', () => {
    const env = parseEnv(valid)
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://example.ae')
    expect(hasS3(env)).toBe(false)
    expect(env.SEED_ADMIN_EMAIL).toBeUndefined()
  })

  it('QM-US3 refuses the e2e clock override in a production deployment, allows it locally', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'production', E2E_CLOCK: '1' })).toThrow(/E2E_CLOCK: is for local end-to-end runs only/)
    expect(parseEnv({ ...valid, NODE_ENV: 'production', E2E_CLOCK: '1', NEXT_PUBLIC_SITE_URL: 'http://localhost:3100' }).E2E_CLOCK).toBe('1')
    expect(parseEnv({ ...valid, NODE_ENV: 'development', E2E_CLOCK: '1' }).E2E_CLOCK).toBe('1')
  })

  it('lists every problem in one message', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URI: 'mongodb://x', PAYLOAD_SECRET: 'short' })).toThrow(
      /DATABASE_URI: must be a postgres[\s\S]*PAYLOAD_SECRET: must be at least 32/,
    )
  })

  it('requires the S3 group all or nothing', () => {
    expect(() => parseEnv({ ...valid, S3_BUCKET: 'media' })).toThrow(/S3 storage needs all of/)
    const env = parseEnv({
      ...valid,
      S3_BUCKET: 'media',
      S3_REGION: 'me-central-1',
      S3_ENDPOINT: 'https://s3.example.com',
      S3_ACCESS_KEY_ID: 'id',
      S3_SECRET_ACCESS_KEY: 'secret',
    })
    expect(hasS3(env)).toBe(true)
  })

  it('falls back to DATABASE_URL (set by the Vercel Neon integration) when DATABASE_URI is unset', () => {
    const { DATABASE_URI, ...rest } = valid
    expect(parseEnv({ ...rest, DATABASE_URL: DATABASE_URI }).DATABASE_URI).toBe(DATABASE_URI)
    expect(parseEnv({ ...valid, DATABASE_URL: 'postgres://other/db' }).DATABASE_URI).toBe(DATABASE_URI)
  })

  it('treats empty optional values as unset', () => {
    expect(parseEnv({ ...valid, SEED_ADMIN_EMAIL: '' }).SEED_ADMIN_EMAIL).toBeUndefined()
  })

  describe('MR-US5-S5 app-link variables', () => {
    const cert = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':')

    it('are optional and unset by default', () => {
      const env = parseEnv(valid)
      expect(env.APP_IOS_APP_IDS).toBeUndefined()
      expect(env.APP_ANDROID_PACKAGE).toBeUndefined()
      expect(env.APP_ANDROID_CERT_SHA256).toBeUndefined()
      expect(parseEnv({ ...valid, APP_IOS_APP_IDS: '  ', APP_ANDROID_CERT_SHA256: '' }).APP_IOS_APP_IDS).toBeUndefined()
    })

    it('parse comma-separated, trimmed lists and a package name', () => {
      const env = parseEnv({
        ...valid,
        APP_IOS_APP_IDS: 'ABCDE12345.ae.shoot.app , ZYXWV98765.ae.shoot.app.beta',
        APP_ANDROID_PACKAGE: ' ae.shoot.app ',
        APP_ANDROID_CERT_SHA256: `${cert}, ${cert.toLowerCase()}`,
      })
      expect(env.APP_IOS_APP_IDS).toEqual(['ABCDE12345.ae.shoot.app', 'ZYXWV98765.ae.shoot.app.beta'])
      expect(env.APP_ANDROID_PACKAGE).toBe('ae.shoot.app')
      expect(env.APP_ANDROID_CERT_SHA256).toEqual([cert, cert])
    })

    it('refuse malformed values with the variable name', () => {
      expect(() => parseEnv({ ...valid, APP_IOS_APP_IDS: 'ae.shoot.app' })).toThrow(/APP_IOS_APP_IDS: /)
      expect(() => parseEnv({ ...valid, APP_IOS_APP_IDS: 'ABCDE12345.ae.shoot.app,' })).toThrow(/APP_IOS_APP_IDS: /)
      expect(() => parseEnv({ ...valid, APP_ANDROID_PACKAGE: 'shoot' })).toThrow(/APP_ANDROID_PACKAGE: /)
      expect(() => parseEnv({ ...valid, APP_ANDROID_PACKAGE: 'ae.1shoot' })).toThrow(/APP_ANDROID_PACKAGE: /)
      expect(() => parseEnv({ ...valid, APP_ANDROID_CERT_SHA256: 'AA:BB' })).toThrow(/APP_ANDROID_CERT_SHA256: /)
      expect(() => parseEnv({ ...valid, APP_ANDROID_CERT_SHA256: cert.replace('00', 'G0') })).toThrow(/APP_ANDROID_CERT_SHA256: /)
    })
  })

  describe('OT-US2-S5 one-time-code delivery', () => {
    const vendor = { UNIFONIC_APP_SID: 'sid', OTP_SMS_SENDER_ID: 'Shoot', OTP_WHATSAPP_SENDER: '+971500000000', OTP_WHATSAPP_TEMPLATE: 'shoot_code' }
    const secret = { OTP_HMAC_SECRET: 'h'.repeat(32) }

    it('refuses the console provider, set or unset, in a production deployment', () => {
      const message = /OTP_PROVIDER: the console provider is for local development and tests only; set a real provider in production/
      expect(() => parseEnv({ ...valid, ...secret, NODE_ENV: 'production' })).toThrow(message)
      expect(() => parseEnv({ ...valid, ...secret, NODE_ENV: 'production', OTP_PROVIDER: 'console' })).toThrow(message)
    })

    it('allows the console provider for localhost production builds and outside production', () => {
      expect(parseEnv({ ...valid, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://localhost:3100' }).OTP_PROVIDER).toBeUndefined()
      expect(parseEnv({ ...valid, NODE_ENV: 'development', OTP_PROVIDER: 'console' }).OTP_PROVIDER).toBe('console')
    })

    it('refuses an HMAC secret shorter than 32 characters, and requires one in production', () => {
      expect(() => parseEnv({ ...valid, OTP_HMAC_SECRET: 'short' })).toThrow(/OTP_HMAC_SECRET: must be at least 32/)
      expect(() => parseEnv({ ...valid, ...vendor, NODE_ENV: 'production', OTP_PROVIDER: 'unifonic' })).toThrow(/OTP_HMAC_SECRET: is required in production/)
    })

    it('needs every vendor variable when the vendor is chosen, and lists the missing ones', () => {
      expect(() => parseEnv({ ...valid, OTP_PROVIDER: 'unifonic', UNIFONIC_APP_SID: 'sid' })).toThrow(
        /missing: OTP_SMS_SENDER_ID, OTP_WHATSAPP_SENDER, OTP_WHATSAPP_TEMPLATE/,
      )
      expect(() => parseEnv({ ...valid, OTP_SMS_SENDER_ID: 'Shoot' })).toThrow(/the unifonic provider needs all of/)
      expect(parseEnv({ ...valid, ...secret, ...vendor, NODE_ENV: 'production', OTP_PROVIDER: 'unifonic' }).OTP_PROVIDER).toBe('unifonic')
    })

    it('refuses an unknown provider', () => {
      expect(() => parseEnv({ ...valid, OTP_PROVIDER: 'pigeon' })).toThrow(/OTP_PROVIDER: must be console or unifonic/)
    })
  })
})
