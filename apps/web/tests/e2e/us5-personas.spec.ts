import { expect, test } from '@playwright/test'
import { adminToken, auth } from './helpers'

test.describe('@persona US5 changing the audience from the CMS', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop')
  })

  test('a new "Teacher" persona appears in the brief builder and registration, and disappears when deactivated', async ({ page, request }) => {
    const token = await adminToken(request)
    const slug = `teacher-${Date.now()}`
    const settings = await (await request.get('/api/globals/site-settings?depth=0', { headers: auth(token) })).json()
    const created = await (await request.post('/api/personas', { headers: auth(token), data: { singular: 'Teacher', plural: 'Teachers', slug, glyph: 'TE' } })).json()
    const teacherId = created.doc.id
    try {
      await request.post('/api/globals/site-settings', { headers: auth(token), data: { activePersonas: [...settings.activePersonas, teacherId] } })
      await expect.poll(async () => (await page.goto('/'), page.getByTestId(`brief-option-persona-${slug}`).count()), { timeout: 60_000 }).toBe(1)
      await page.goto('/register?type=provider')
      await expect(page.getByLabel('I am a').locator(`option[value="${slug}"]`)).toHaveCount(1)
      await expect(page.getByTestId('section-for-professionals')).toHaveCount(0) // not on /register
      await page.goto('/')
      await expect(page.getByTestId('section-for-professionals')).toContainText('teacher')

      await request.patch(`/api/personas/${teacherId}`, { headers: auth(token), data: { active: false } })
      await expect.poll(async () => (await page.goto('/'), page.getByTestId(`brief-option-persona-${slug}`).count()), { timeout: 60_000 }).toBe(0)
    } finally {
      await request.post('/api/globals/site-settings', { headers: auth(token), data: { activePersonas: settings.activePersonas } })
      await request.delete(`/api/personas/${teacherId}`, { headers: auth(token) })
    }
  })

  test('US5-S4 deleting a referenced persona is refused', async ({ request }) => {
    const token = await adminToken(request)
    const { docs } = await (await request.get('/api/personas?where[slug][equals]=videographer', { headers: auth(token) })).json()
    const res = await request.delete(`/api/personas/${docs[0].id}`, { headers: auth(token) })
    expect(res.status()).toBe(400)
    expect(JSON.stringify(await res.json())).toContain('still used by')
  })
})
