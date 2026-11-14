import { expect, test } from '@playwright/test'
import { creatorListV1, resolveV1, siteV1 } from '@shoot/domain/api/v1'

// MR-SC-001: the mobile API on the built app with the seed (008 T089). Desktop project only. The
// association files need APP_IOS_APP_IDS and APP_ANDROID_* (set in playwright.config.ts webServer).
test.describe('MR-SC-001 mobile API smoke', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop')
  })

  test('MR-SC-001 site, creators, resolve and both association files parse with their schemas', async ({ request }) => {
    const site = await request.get('/api/mobile/v1/site', { headers: { 'accept-language': 'ar' } })
    expect(site.status()).toBe(200)
    expect(site.headers()['content-language']).toBe('ar')
    expect(site.headers()['cache-control']).toContain('public')
    siteV1.parse(await site.json())

    const creators = await request.get('/api/mobile/v1/creators')
    expect(creators.status()).toBe(200)
    creatorListV1.parse(await creators.json())

    const resolved = await request.get('/api/mobile/v1/resolve?path=%2Far%2Fdoes-not-exist')
    expect(resolved.status()).toBe(200)
    expect(resolveV1.parse(await resolved.json())).toEqual({ status: 'notFound', path: '/does-not-exist', locale: 'ar' })

    for (const file of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
      const res = await request.get(file, { maxRedirects: 0 })
      expect(res.status(), file).toBe(200)
      expect(res.headers()['content-type']).toContain('application/json')
      expect(res.headers()['cache-control']).toBe('public, max-age=3600')
      expect(await res.json()).toBeTruthy()
    }
  })
})
