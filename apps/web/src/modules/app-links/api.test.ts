import { APP_LINK_PREFIXES } from '@shoot/domain/api/v1'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const current: { value: Record<string, unknown> } = { value: {} }
vi.mock('@/shared/lib/env', () => ({ env: () => current.value }))

const { appleAssociationFile, assetLinksFile } = await import('./api')

const CERT = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89'

describe('MR-US5-S5 the association files', () => {
  beforeEach(() => {
    current.value = {}
  })

  it('answer 404 while the app is not configured', () => {
    expect(appleAssociationFile().status).toBe(404)
    expect(assetLinksFile().status).toBe(404)
    current.value = { APP_ANDROID_PACKAGE: 'ae.shoot.mobile' }
    expect(assetLinksFile().status).toBe(404)
  })

  it('serve the Apple file as JSON for an hour, with every prefix', async () => {
    current.value = { APP_IOS_APP_IDS: ['ABCDE12345.ae.shoot.mobile'] }
    const res = appleAssociationFile()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
    const body = (await res.json()) as { applinks: { details: { appIDs: string[]; components: { '/': string }[] }[] } }
    expect(body.applinks.details[0]?.appIDs).toEqual(['ABCDE12345.ae.shoot.mobile'])
    expect(body.applinks.details[0]?.components.map((c) => c['/'])).toEqual(expect.arrayContaining([...APP_LINK_PREFIXES]))
  })

  it('serve the Android file with the package and fingerprints', async () => {
    current.value = { APP_ANDROID_PACKAGE: 'ae.shoot.mobile', APP_ANDROID_CERT_SHA256: [CERT] }
    const res = assetLinksFile()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(await res.json()).toEqual([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'ae.shoot.mobile', sha256_cert_fingerprints: [CERT] } }])
  })
})
