import { expect, test } from '@playwright/test'
import { a11y, inEnglish } from './helpers'

// Demo seed (SEED_DEMO_GUIDES=1): 30 guides (the newest three scheduled), authors demo-sara and demo-omar,
// categories planning / on-the-day / after-the-shoot, Arabic text for guides 1 to 6.
test.describe('MP-US3 guides', () => {
  test('@smoke MP-US3-S1 the listing is newest first, twelve a page, and pages work without scripting', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/guides')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Guides')
    await expect(page.getByTestId('article-card')).toHaveCount(12)
    await expect(page.getByTestId('article-card').first().getByRole('link')).toHaveAttribute('href', '/guides/demo-guide-27')
    await page.getByRole('link', { name: 'Next' }).click()
    await expect(page).toHaveURL(/\/guides\?page=2$/)
    await expect(page.getByTestId('article-card')).toHaveCount(12)
    await page.getByRole('link', { name: 'Next' }).click()
    await expect(page.getByTestId('article-card')).toHaveCount(3)
    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0)
    await a11y(page, info)
  })

  test('MP-US3-S1 a topic filters the list through its own address', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/guides')
    await page.getByTestId('category-nav').getByRole('link', { name: 'Planning' }).click()
    await expect(page).toHaveURL(/\/guides\/category\/planning$/)
    const cards = await page.getByTestId('article-card').count()
    expect(cards).toBeGreaterThan(0)
    expect(cards).toBeLessThan(12)
  })

  test('MP-US3-S3 a guide shows its author, date, reading time, cover text and the two ways to go on', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/guides/demo-guide-27')
    const view = page.getByTestId('article-view')
    await expect(view.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(view).toContainText(/By (Sara|Omar) Demo/)
    await expect(view).toContainText(/\d+ min read/)
    await expect(view.getByRole('img').first()).toHaveAttribute('alt', /Demo cover/)
    await expect(view.getByRole('complementary').getByRole('link')).toHaveCount(2)
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
    await a11y(page, info)
  })

  test('MP-US3-S2 a guide scheduled for the future does not exist for visitors', async ({ page, request }, info) => {
    await inEnglish(page, info, test.skip)
    expect((await page.goto('/guides/demo-guide-30'))?.status()).toBe(404)
    const feed = await (await request.get('/guides/feed')).text()
    expect(feed).not.toContain('demo-guide-30')
    expect(await (await request.get('/sitemap.xml')).text()).not.toContain('demo-guide-30')
  })

  test('MP-US3-S4 the feed is RSS with the newest guides', async ({ request }) => {
    const response = await request.get('/guides/feed')
    expect(response.headers()['content-type']).toContain('application/rss+xml')
    const xml = await response.text()
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('/guides/demo-guide-27')
    expect((xml.match(/<item>/g) ?? []).length).toBe(20)
  })

  test('MP-US3-S5 in Arabic the page is right-to-left, a guide without Arabic text is marked, and the Arabic feed holds only translated guides', async ({ page, request }) => {
    await page.goto('/ar/guides')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByText('متاح بالإنجليزية').first()).toBeVisible()
    const xml = await (await request.get('/ar/guides/feed')).text()
    expect((xml.match(/<item>/g) ?? []).length).toBe(6)
    expect(xml).toContain('<language>ar</language>')
  })

  test('MP-US3-S6 an author page lists their guides', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/guides/author/demo-sara')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sara Demo')
    expect(await page.getByTestId('article-card').count()).toBeGreaterThan(0)
  })
})
