import { expect, test, type Page } from '@playwright/test'
import { expectNoSeriousA11yIssues } from './helpers'

// Demo seed (SEED_DEMO_CREATORS=1): listed with samples D2222 (featured), D3333, D4444, D7777 (photo + video);
// listed without samples D6666; in review D5555; paused D8888.
const NETWORK = ['D2222', 'D3333', 'D4444', 'D7777']
const DIRECTORY = [...NETWORK, 'D6666'].sort()
const NEVER = ['D5555', 'D8888']

// The scope may itself carry the code (the Top Hit) or contain rows that do (the lists).
const codes = (page: Page, scope: string) =>
  page.locator(`${scope}[data-code], ${scope} [data-code]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-code')))

test.describe('CP-US1 browse verified creators', () => {
  test('@smoke CP-US1-S1 the landing network block shows listed creators with samples and never an unlisted one', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('creator-network')).toBeVisible()
    const shown = await codes(page, '[data-testid="creator-network"]')
    expect([...shown].sort()).toEqual(NETWORK)
    for (const hidden of [...NEVER, 'D6666']) expect(shown).not.toContain(hidden)
    // Featured creators lead.
    expect(shown[0]).toBe('D2222')
    await expect(page.getByRole('link', { name: /^(See everyone|عرض الجميع)$/ })).toHaveAttribute('href', /\/creators$/)
  })

  test('@smoke CP-US1-S3 the directory lists listed creators and never an unverified, hidden or paused one', async ({ page }) => {
    await page.goto('/creators')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Find your professional|ابحث عن محترفك/)
    const all = [...(await codes(page, '[data-testid="creator-top-hit"]')), ...(await codes(page, '[data-testid="directory-list"]'))]
    expect([...all].sort()).toEqual(DIRECTORY)
    expect(all[0]).toBe('D2222')
    for (const hidden of NEVER) expect(all).not.toContain(hidden)
    // A creator without samples is listed, but last.
    expect(all.at(-1)).toBe('D6666')
  })

  test('CP-US1-S2 filters narrow the list with counts, one link at a time (works without JavaScript)', async ({ page }) => {
    await page.goto('/creators')
    const open = async (key: 'type' | 'specialty' | 'place') => page.getByTestId(`filter-${key}`).locator('summary').click()
    const choose = async (key: 'type' | 'specialty' | 'place', value: string) => {
      await page.getByTestId(`filter-${key}`).locator(`[data-value="${value}"]`).click()
      await page.waitForURL((u) => u.searchParams.get(key) === value)
    }

    await open('type')
    const videographers = page.getByTestId('filter-type').locator('[data-value="videographer"]')
    await expect(videographers).toContainText('2') // Omar and Maya
    await expect(page.getByTestId('filter-type').locator('[data-value="photographer"]')).toContainText('4')
    await choose('type', 'videographer')
    expect([...(await codes(page, '[data-testid="creator-top-hit"]')), ...(await codes(page, '[data-testid="directory-list"]'))].sort()).toEqual(['D3333', 'D7777'])

    await open('place')
    await choose('place', 'abu-dhabi') // Maya works in Dubai and Abu Dhabi, Omar in Al Ain (a city of Abu Dhabi)
    expect((await codes(page, '[data-testid="creator-top-hit"]')).concat(await codes(page, '[data-testid="directory-list"]')).sort()).toEqual(['D3333', 'D7777'])

    await open('specialty')
    await choose('specialty', 'corporate-branding') // only Omar
    expect(await codes(page, '[data-testid="creator-top-hit"]')).toEqual(['D3333'])

    await page.getByTestId('filter-clear').click()
    await page.waitForURL((u) => !u.search)
    expect((await codes(page, '[data-testid="creator-top-hit"]')).length).toBe(1)
  })

  test('CP-US1-S2 an unknown filter value is ignored, and no match offers a way forward', async ({ page }) => {
    await page.goto('/creators?type=teacher&place=mars')
    expect((await codes(page, '[data-testid="creator-top-hit"]')).length).toBe(1)
    await page.goto('/creators?type=videographer&specialty=fashion-beauty&place=sharjah')
    await expect(page.getByTestId('directory-empty')).toBeVisible()
    await expect(page.getByRole('link', { name: /Send a brief instead|أرسل طلبك بدلاً من ذلك/ })).toBeVisible()
  })

  test('SC-001 from the landing page to a creator takes at most five interactions', async ({ page }) => {
    let interactions = 0
    await page.goto('/')
    await page.getByRole('link', { name: /^(See everyone|عرض الجميع)$/ }).click()
    interactions += 1
    await page.getByTestId('filter-place').locator('summary').click()
    interactions += 1
    await page.getByTestId('filter-place').locator('[data-value="sharjah"]').click()
    interactions += 1
    await page.waitForURL(/place=sharjah/)
    await page.getByTestId('creator-top-hit').click()
    interactions += 1
    await expect(page).toHaveURL(/\/creators\/d4444$/)
    expect(interactions).toBeLessThanOrEqual(5)
  })

  test('CP-FR-010 no horizontal overflow at 360 px, serious accessibility issues none, in this language and theme', async ({ page }, info) => {
    test.skip(info.project.name === 'nojs', 'measuring and axe need JavaScript; the no-JS project covers behaviour')
    await page.setViewportSize({ width: 360, height: 740 })
    for (const path of ['/', '/creators', '/creators?type=videographer']) {
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, path).toBeLessThanOrEqual(0)
      await expectNoSeriousA11yIssues(page)
    }
  })

  test('CP-FR-010 the directory follows the page language and direction', async ({ page }, info) => {
    await page.goto('/creators')
    const html = page.locator('html')
    if (info.project.name === 'ar-mobile') {
      await expect(html).toHaveAttribute('lang', 'ar')
      await expect(html).toHaveAttribute('dir', 'rtl')
      await expect(page.getByTestId('creator-top-hit')).toContainText('(تجريبي)')
      // The code stays readable left to right inside the right-to-left row.
      await expect(page.getByTestId('creator-top-hit').locator('bdi')).toHaveAttribute('dir', 'ltr')
    } else {
      await expect(html).toHaveAttribute('dir', 'ltr')
      await expect(page.getByTestId('creator-top-hit')).toContainText('Demo')
    }
  })
})
