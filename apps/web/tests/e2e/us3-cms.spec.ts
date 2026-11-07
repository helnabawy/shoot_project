import { expect, test } from '@playwright/test'
import { ADMIN, adminToken, auth, uniqueEmail } from './helpers'

test.describe('US3 editing without a developer', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop')
  })

  test('US3-S1 a published hero change is live on the site within a minute', async ({
    page,
    request,
  }) => {
    const token = await adminToken(request)
    const original = await (
      await request.get('/api/globals/landing-page?depth=0', { headers: auth(token) })
    ).json()
    // The trust line under the bar is a visible hero field (the subheadline is no longer shown).
    const chip = `Edited in the CMS ${Date.now()}`
    try {
      const res = await request.post('/api/globals/landing-page?draft=false', {
        headers: auth(token),
        data: { hero: { ...original.hero, trustChips: [{ text: chip }] }, _status: 'published' },
      })
      expect(res.ok()).toBeTruthy()
      await expect
        .poll(async () => (await page.goto('/'), page.getByText(chip).count()), { timeout: 60_000 })
        .toBe(1)
    } finally {
      await request.post('/api/globals/landing-page?draft=false', {
        headers: auth(token),
        data: { hero: original.hero, _status: 'published' },
      })
    }
  })

  test('US3-S4 a draft stays private until published, but editors can preview it', async ({
    page,
    request,
    context,
  }) => {
    const token = await adminToken(request)
    const original = await (
      await request.get('/api/globals/landing-page?depth=0', { headers: auth(token) })
    ).json()
    const draftLine = `Draft only ${Date.now()}`
    await request.post('/api/globals/landing-page?draft=true', {
      headers: auth(token),
      data: { hero: { ...original.hero, trustChips: [{ text: draftLine }] } },
    })
    try {
      await page.goto('/')
      await expect(page.getByText(draftLine)).toHaveCount(0)
      const login = await page.request.post('/api/users/login', { data: ADMIN })
      expect(login.ok()).toBeTruthy()
      await page.goto(`/next/preview?secret=${process.env.PREVIEW_SECRET}&path=/`)
      await expect(page.getByText(draftLine)).toBeVisible()
      await page.goto('/next/exit-preview')
    } finally {
      await request.post('/api/globals/landing-page?draft=false', {
        headers: auth(token),
        data: { hero: original.hero, _status: 'published' },
      })
      await context.clearCookies()
    }
  })

  test('US3-S5 a member cannot open the content area; an admin can', async ({
    browser,
    request,
  }) => {
    const email = uniqueEmail('member-admin')
    await request.post('/api/users', {
      data: { name: 'Member', email, password: 'password-123', accountType: 'seeker' },
    })
    const member = await browser.newContext()
    const page = await member.newPage()
    await page.request.post('/api/users/login', { data: { email, password: 'password-123' } })
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: /Landing page/i })).toHaveCount(0)
    await member.close()

    const admin = await browser.newContext()
    const adminPage = await admin.newPage()
    await adminPage.request.post('/api/users/login', { data: ADMIN })
    await adminPage.goto('/admin')
    await expect(adminPage.getByRole('link', { name: /Landing page/i }).first()).toBeVisible({
      timeout: 30_000,
    })
    await admin.close()
  })
})
