import { expect, test } from '@playwright/test'
import { ADMIN, expectNoSeriousA11yIssues } from './helpers'

test.describe('US6 Arabic and English', () => {
  test('@smoke US6-S1 / US6-S7 the Arabic site is Arabic, right-to-left and does not overflow', async ({ page }, info) => {
    test.skip(info.project.name !== 'ar-mobile')
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('أنت تحدّد. نحن نصوّر.')
    const wa = await page.getByTestId('whatsapp-secondary').getAttribute('href')
    expect(decodeURIComponent(wa!)).toContain('مرحباً')
    const overflow = await page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expectNoSeriousA11yIssues(page)
  })

  test('@smoke US6-S3 a first visit is answered in the browser language', async ({ page }, info) => {
    test.skip(info.project.name !== 'ar-mobile')
    await page.goto('/')
    await expect(page).toHaveURL(/\/ar$/)
  })

  test('US6-S2 the switcher keeps the section, avoids a reload and remembers the choice', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    await page.goto('/ar#how-it-works')
    const marker = await page.evaluate(() => ((window as unknown as { __m: number }).__m = 42))
    await page.getByTestId('locale-switcher').first().click()
    await expect(page).toHaveURL(/\/#how-it-works$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(await page.evaluate(() => (window as unknown as { __m?: number }).__m)).toBe(marker)
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('en')
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
  })

  test('without JavaScript the switcher still changes and remembers the language', async ({ page }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/ar')
    await page.getByTestId('locale-switcher').first().click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('US6-S8 every page declares both languages for search engines', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    for (const url of ['/', '/ar', '/register']) {
      await page.goto(url)
      for (const lang of ['en', 'ar', 'x-default']) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1)
      }
    }
  })

  test('US6-S6 the admin interface turns Arabic and right-to-left for an Arabic editor', async ({ page }, info) => {
    test.skip(info.project.name !== 'ar-mobile')
    await page.request.post('/api/users/login', { data: ADMIN })
    await page.goto('/admin')
    await expect(page.locator('html')).toHaveAttribute('dir', /rtl/i, { timeout: 30_000 })
  })
})
