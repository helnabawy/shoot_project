import { expect, test } from '@playwright/test'
import { expectNoSeriousA11yIssues } from './helpers'
import { DEMO_CREATORS, LISTED_DEMO_CREATORS } from '../../src/shared/payload/seed/demo-creators.data'

// Demo seed (SEED_DEMO_CREATORS=1). Expectations come from the seed's own data, so adding a demo
// creator never breaks this spec. Written 2026-11-14 (T068); e2e runs are deferred by the owner.

const SPECIALTY = 'portrait'
const LISTED_HERE = LISTED_DEMO_CREATORS.filter((c) => c.specialties.includes(SPECIALTY)).map((c) => c.code)
const NEVER = DEMO_CREATORS.filter((c) => !LISTED_DEMO_CREATORS.includes(c)).map((c) => c.code)

test.describe('CP-US4 a specialty page', () => {
  test('@smoke CP-US4-S1 specialty page lists creators/samples with real counts', async ({ page }) => {
    await page.goto(`/work/${SPECIALTY}`)
    await expect(page.getByTestId('specialty-header').getByRole('heading', { level: 1 })).toBeVisible()
    const shown = await page.locator('[data-code]').evaluateAll((els) => els.map((e) => e.getAttribute('data-code')))
    expect(shown.length).toBeGreaterThan(0)
    for (const code of shown) expect(LISTED_HERE).toContain(code)
    for (const hidden of NEVER) expect(shown).not.toContain(hidden)
    // Counts are shown only when above zero and never invented: every number on the line is positive.
    const counts = page.getByTestId('specialty-counts')
    if (await counts.count()) {
      const numbers = ((await counts.textContent()) ?? '').match(/\d+/g) ?? []
      for (const n of numbers) expect(Number(n)).toBeGreaterThan(0)
    }
    await expect(page.getByTestId('specialty-samples')).toBeVisible()
    await expectNoSeriousA11yIssues(page)
  })

  test('CP-US4-S2 reachable from the landing grid; per-language SEO text', async ({ page }) => {
    await page.goto('/')
    const href = `/work/${SPECIALTY}`
    await page.locator(`a[data-testid="category-link"][href$="${href}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    const english = { title: await page.title(), h1: await page.getByRole('heading', { level: 1 }).textContent() }

    await page.goto(`/ar${href}`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const arabic = { title: await page.title(), h1: await page.getByRole('heading', { level: 1 }).textContent() }
    expect(arabic.title).not.toBe(english.title)
    expect(arabic.h1).not.toBe(english.h1)
    await expectNoSeriousA11yIssues(page)
  })
})
