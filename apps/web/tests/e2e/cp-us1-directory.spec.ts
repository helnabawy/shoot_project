import { expect, test, type Page } from '@playwright/test'
import { expectNoSeriousA11yIssues } from './helpers'
import { locations } from '../../src/shared/payload/seed/content'
import { DEMO_CREATORS, LISTED_DEMO_CREATORS } from '../../src/shared/payload/seed/demo-creators.data'

// Demo seed (SEED_DEMO_CREATORS=1): expectations come from the seed's own data, so adding a demo
// creator never breaks a count here. D2222 is the one featured creator; D6666 is listed without
// samples; D5555 is in review and D8888 is paused, so neither is ever shown.
const LISTED = LISTED_DEMO_CREATORS
const DIRECTORY = LISTED.map((c) => c.code).sort()
const WITH_SAMPLES = LISTED.filter((c) => c.samples > 0).map((c) => c.code)
const NEVER = DEMO_CREATORS.filter((c) => !LISTED.includes(c)).map((c) => c.code)
const NETWORK_COUNT = 12
/** The one featured creator, so the directory's Top Hit. */
const TOP_HIT = DEMO_CREATORS.find((c) => c.code === 'D2222')!
const emirateOf = (slug: string) => locations.find((e) => e.slug === slug || e.cities.some((c) => c.slug === slug))?.slug
const where = (f: { type?: string; specialty?: string; place?: string }) =>
  LISTED.filter(
    (c) =>
      (!f.type || c.personas.includes(f.type)) &&
      (!f.specialty || c.specialties.includes(f.specialty)) &&
      (!f.place || c.cities.some((city) => emirateOf(city) === f.place)),
  ).map((c) => c.code)
/** A facet count as shown, matched as a whole number (so 2 never matches 12). */
const count = (n: number) => new RegExp(`(^|\\D)${n}(\\D|$)`)

// The scope may itself carry the code (the Top Hit) or contain rows that do (the lists).
const codes = (page: Page, scope: string) =>
  page.locator(`${scope}[data-code], ${scope} [data-code]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-code')))

test.describe('CP-US1 browse verified creators', () => {
  test('@smoke CP-US1-S1 the landing network block shows listed creators with samples and never an unlisted one', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('creator-network')).toBeVisible()
    const shown = await codes(page, '[data-testid="creator-network"]')
    expect(shown).toHaveLength(Math.min(NETWORK_COUNT, WITH_SAMPLES.length))
    for (const code of shown) expect(WITH_SAMPLES).toContain(code)
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
    const shownNow = async () => [...(await codes(page, '[data-testid="creator-top-hit"]')), ...(await codes(page, '[data-testid="directory-list"]'))].sort()
    await expect(videographers).toContainText(count(where({ type: 'videographer' }).length))
    await expect(page.getByTestId('filter-type').locator('[data-value="photographer"]')).toContainText(count(where({ type: 'photographer' }).length))
    await choose('type', 'videographer')
    expect(await shownNow()).toEqual(where({ type: 'videographer' }).sort())

    await open('place')
    // A city counts for its emirate: Omar works in Al Ain, a city of Abu Dhabi.
    await choose('place', 'abu-dhabi')
    expect(await shownNow()).toEqual(where({ type: 'videographer', place: 'abu-dhabi' }).sort())
    expect(await shownNow()).toContain('D3333')

    await open('specialty')
    await choose('specialty', 'corporate-branding')
    expect(await shownNow()).toEqual(where({ type: 'videographer', place: 'abu-dhabi', specialty: 'corporate-branding' }).sort())

    await page.getByTestId('filter-clear').click()
    await page.waitForURL((u) => !u.search)
    expect((await codes(page, '[data-testid="creator-top-hit"]')).length).toBe(1)
  })

  test('CP-US1-S2 an unknown filter value is ignored, and no match offers a way forward', async ({ page }) => {
    await page.goto('/creators?type=teacher&place=mars')
    expect((await codes(page, '[data-testid="creator-top-hit"]')).length).toBe(1)
    // The seed has no videographer for fashion and beauty in Sharjah.
    expect(where({ type: 'videographer', specialty: 'fashion-beauty', place: 'sharjah' })).toEqual([])
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
    // The profile route is compiled on first visit on a development server, which can take a few seconds.
    await expect(page).toHaveURL(/\/creators\/[a-z0-9]{5}$/, { timeout: 20_000 })
    expect(where({ place: 'sharjah' }).map((c) => c.toLowerCase())).toContain(page.url().split('/').pop())
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
      await expect(page.getByTestId('creator-top-hit')).toContainText(TOP_HIT.name.ar)
      // The code stays readable left to right inside the right-to-left row.
      await expect(page.getByTestId('creator-top-hit').locator('bdi')).toHaveAttribute('dir', 'ltr')
    } else {
      await expect(html).toHaveAttribute('dir', 'ltr')
      await expect(page.getByTestId('creator-top-hit')).toContainText(TOP_HIT.name.en)
    }
  })
})
