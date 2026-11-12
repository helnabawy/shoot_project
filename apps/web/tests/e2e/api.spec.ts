import { expect, test } from '@playwright/test'
import { adminToken, auth, uniqueEmail, createAccount } from './helpers'

// REST contract (contracts/rest-api.md); runs once.
test.describe('REST contract', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop')
  })

  test('health, registration rules, briefs and drafts', async ({ request }) => {
    expect(await (await request.get('/api/health')).json()).toEqual({ status: 'ok', db: 'ok' })

    // Anonymous: no briefs, no audience edits, no internal tables.
    expect((await request.get('/api/briefs')).status()).toBe(403)
    expect((await request.post('/api/personas', { data: { singular: 'X', plural: 'Xs', slug: 'x' } })).status()).toBe(403)
    expect((await request.get('/api/rate-limits')).status()).toBe(403)

    const email = uniqueEmail('api')
    // Feature 009 (T083): no public endpoint creates users.
    expect((await request.post('/api/users', { data: { name: 'API', email, password: 'password-123', accountType: 'seeker', roles: ['admin'] } })).status()).toBe(403)
    await createAccount(request, { name: 'API', email, password: 'password-123', accountType: 'seeker' })

    const login = await request.post('/api/users/login', { data: { email, password: 'password-123' } })
    expect(login.ok()).toBeTruthy()
    expect(login.headers()['set-cookie']).toContain('payload-token')
    // Signed in as a member: their own (empty) list, still no audience edits.
    expect((await (await request.get('/api/briefs')).json()).totalDocs).toBe(0)
    expect((await request.post('/api/personas', { data: { singular: 'X', plural: 'Xs', slug: 'x' } })).status()).toBe(403)


    const token = await adminToken(request)
    const bad = await request.post('/api/globals/site-settings', { headers: auth(token), data: { whatsappNumber: '0501234567' } })
    expect(bad.status()).toBe(400)
    const arabic = await (await request.get('/api/globals/landing-page?locale=ar')).json()
    expect(arabic.hero.headline).toBe('أنت تحدّد. نحن نصوّر.')
    expect((await request.get('/api/cron/cleanup')).status()).toBe(401)
  })
})
