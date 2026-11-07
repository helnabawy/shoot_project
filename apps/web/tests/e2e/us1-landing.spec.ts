import { expect, test } from '@playwright/test'
import { expectNoSeriousA11yIssues } from './helpers'

test.describe('US1 landing page', () => {
  test.beforeEach(({}, info) => {
    test.skip(
      info.project.name !== 'mobile' && info.project.name !== 'desktop',
      'English light layouts',
    )
  })

  test('@smoke US1-S1 hero, brief builder and sections render in order', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'You brief. We shoot.' }),
    ).toBeVisible()
    await expect(page.getByTestId('brief-builder')).toBeVisible()
    const ids = await page.locator('main section[id]').evaluateAll((els) => els.map((e) => e.id))
    expect(ids).toEqual([
      'brief',
      'how-it-works',
      'why-us',
      'specialties',
      'our-network', // present because the e2e seed includes the demo creators
      'for-professionals',
      'faq',
    ])
  })

  test('@smoke FR-057 the search field and the first list start above the fold on a 360×640 phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/')
    await expect(page.getByRole('searchbox')).toBeInViewport()
    await expect(page.locator('[data-current="true"] label[data-testid^="brief-option-"]').first()).toBeInViewport()
  })

  test('US1-S2 in-page navigation scrolls without reloading and updates the URL', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/')
    const marker = await page.evaluate(
      () => ((window as unknown as { __marker: number }).__marker = Math.random()),
    )
    if (isMobile) await page.getByTestId('nav-mobile-toggle').click()
    await page.getByRole('navigation').getByRole('link', { name: 'How it works' }).first().click()
    await expect(page).toHaveURL(/#how-it-works$/)
    await expect(page.locator('#how-it-works')).toBeInViewport()
    expect(await page.evaluate(() => (window as unknown as { __marker: number }).__marker)).toBe(
      marker,
    )
  })

  test('US1-S3 no horizontal overflow at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('@smoke US1-S4 no serious accessibility violations; one h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expectNoSeriousA11yIssues(page)
  })
})
