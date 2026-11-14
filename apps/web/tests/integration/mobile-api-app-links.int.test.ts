import { APP_LINK_PREFIXES } from '@shoot/domain/api/v1'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `env()` is cached per process, so the configuration is swapped through a mock; the files are
// exercised through their route modules at the site root (MR-US5-S5).
const current: { value: Record<string, unknown> } = { value: {} }
vi.mock('@/shared/lib/env', async (original) => ({ ...(await original<object>()), env: () => current.value }))

const { GET: apple } = await import('@/app/.well-known/apple-app-site-association/route')
const { GET: android } = await import('@/app/.well-known/assetlinks.json/route')

const CERT = Array.from({ length: 32 }, () => 'AB').join(':')

describe('MR-US5-S5 association files at fixed addresses, not proxied; not found', () => {
  beforeEach(() => {
    current.value = {}
  })

  it('both are 404 while unset', () => {
    expect(apple().status).toBe(404)
    expect(android().status).toBe(404)
  })

  it('with the env set, both are 200 application/json for an hour, with the expected bodies', async () => {
    current.value = { APP_IOS_APP_IDS: ['ABCDE12345.ae.shoot.mobile'], APP_ANDROID_PACKAGE: 'ae.shoot.mobile', APP_ANDROID_CERT_SHA256: [CERT] }
    const a = apple()
    const g = android()
    for (const res of [a, g]) {
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('application/json')
      expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
      expect(res.headers.get('location')).toBeNull()
    }
    const body = JSON.stringify(await a.json())
    // The Apple file has no locale of its own: the Arabic prefixes are listed, nothing is redirected.
    for (const prefix of APP_LINK_PREFIXES) expect(body).toContain(`"${prefix}"`)
    expect(await g.json()).toEqual([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'ae.shoot.mobile', sha256_cert_fingerprints: [CERT] } }])
  })
})
