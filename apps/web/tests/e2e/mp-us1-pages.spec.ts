import { expect, test } from '@playwright/test'
import { a11y, inEnglish } from './helpers'

// The default seed publishes the "Studios" page (English /studios, Arabic /استوديوهات) in the footer group "Company".
test.describe('MP-US1 editor-built pages', () => {
  test('@smoke MP-US1-S1 the Studios page renders with one h1 and is linked from the footer', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/studios')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studios')
    await expect(page.getByTestId('page-view')).toBeVisible()
    await expect(page.getByTestId('footer-groups').getByRole('link', { name: 'Studios' })).toHaveAttribute('href', '/studios')
    await a11y(page, info)
  })

  test('MP-US1-S1 MP-FR-013 the sitemap lists it with each language’s own address', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toContain('/studios</loc>')
    expect(decodeURI(xml)).toContain('/ar/استوديوهات')
  })

  test('MP-US1-S3 the English address leads an Arabic reader to the Arabic address of the same page', async ({ page }, info) => {
    await page.goto('/ar/studios')
    await expect(page).toHaveURL(/\/ar\/%D8%A7%D8%B3%D8%AA%D9%88%D8%AF%D9%8A%D9%88%D9%87%D8%A7%D8%AA$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('الاستوديوهات')
    await a11y(page, info)
  })

  test('MP-US1-S2 an address that is not a published page is the not-found page', async ({ page }) => {
    const response = await page.goto('/not-a-page-anyone-wrote')
    expect(response?.status()).toBe(404)
  })

  test('MP-FR-017 has no horizontal scroll at the four widths', async ({ page }, info) => {
    test.skip(info.project.name === 'nojs', 'measuring needs JavaScript')
    await page.goto('/studios')
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${width}px`).toBeLessThanOrEqual(0)
    }
  })
})
