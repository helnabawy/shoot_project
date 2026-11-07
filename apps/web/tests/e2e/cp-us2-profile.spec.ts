import { expect, test, type Page } from '@playwright/test'
import { adminToken, auth, expectNoSeriousA11yIssues } from './helpers'

// Demo seed: D2222 Sara (photographer, 4 samples, featured), D7777 Maya (photo + video, 4 samples),
// D6666 Kareem (no samples), D5555 Noor (in review), D8888 Zane (paused).
const asked = (page: Page) => page.locator('[data-current="true"]')

/** Answers whatever step is asked until the brief is complete (independent of the CMS's options). */
async function finishBrief(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    if (await page.getByTestId('brief-submit').isVisible()) return
    const step = asked(page)
    const next = step.locator('[data-testid^="brief-continue-"]')
    if (await next.isVisible()) {
      await next.click()
      continue
    }
    const skip = step.locator('[data-testid^="brief-skip-"]')
    if (await skip.isVisible()) {
      await skip.click()
      continue
    }
    await step.locator('label[data-testid^="brief-option-"]').first().click()
  }
  await expect(page.getByTestId('brief-submit')).toBeVisible()
}

const stubWhatsApp = (page: Page) =>
  page.context().route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, (route) => route.fulfill({ body: 'whatsapp' }))

test.describe('CP-US2 view a creator profile', () => {
  test('@smoke CP-US2-S1 CP-FR-007 the profile renders every section from the data, and the code redirects to one address', async ({ page }, info) => {
    await page.goto('/creators/CR-D2222')
    await expect(page).toHaveURL(/\/creators\/d2222$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(info.project.name === 'ar-mobile' ? '(تجريبي)' : 'Sara Demo')
    await expect(page.getByTestId('profile-code')).toContainText('CR-D2222')
    await expect(page.getByTestId('badge-verified')).toBeVisible()
    await expect(page.getByTestId('profile-book')).toBeVisible()
    await expect(page.getByTestId('profile-ask-whatsapp').first()).toBeVisible()
    await expect(page.getByTestId('profile-bio')).toBeVisible()
    await expect(page.getByTestId('sample-gallery').locator('li')).toHaveCount(4)
    // The other spellings land on the same page.
    await page.goto('/creators/D2222')
    await expect(page).toHaveURL(/\/creators\/d2222$/)
  })

  test('CP-US2-S1 / CP-FR-008 gallery images have alt text, load lazily and use the sized card variant', async ({ page }) => {
    await page.goto('/creators/d2222')
    const images = page.getByTestId('sample-gallery').locator('img')
    await expect(images).toHaveCount(4)
    for (const img of await images.all()) {
      expect((await img.getAttribute('alt'))?.length).toBeGreaterThan(5)
      await expect(img).toHaveAttribute('loading', 'lazy')
      // next/image serves the card variant (800 px wide), never the original upload.
      expect(decodeURIComponent((await img.getAttribute('src')) ?? '')).toMatch(/-800x\d+\.webp/)
    }
  })

  test('CP-US2-S1 a sample opens large in a viewer and Escape closes it (with JavaScript); without it the link opens the file', async ({ page }, info) => {
    await page.goto('/creators/d2222')
    const first = page.getByTestId('sample-0').getByRole('link')
    if (info.project.name === 'nojs') {
      expect(await first.getAttribute('href')).toMatch(/\/api\/media\/file\/.+/)
      return
    }
    await first.click()
    await expect(page.getByTestId('sample-viewer')).toBeVisible()
    await expect(page.getByTestId('sample-viewer').locator('img')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('sample-viewer')).toBeHidden()
    await expect(first).toBeFocused()
  })

  test('CP-US2-S1 the Book action is above the fold on a 360×640 phone, with no overflow and no serious a11y issues', async ({ page }, info) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/creators/d2222')
    await expect(page.getByTestId('profile-book')).toBeInViewport({ ratio: 1 })
    if (info.project.name === 'nojs') return
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await expectNoSeriousA11yIssues(page)
  })

  test('CP-US2 a creator without samples says so plainly instead of showing an empty grid', async ({ page }) => {
    await page.goto('/creators/d6666')
    await expect(page.getByTestId('profile-awaiting-samples')).toBeVisible()
    await expect(page.getByTestId('sample-gallery')).toHaveCount(0)
    await expect(page.getByTestId('profile-book')).toBeVisible()
  })

  test('CP-US1-S3 an unknown, in-review or paused creator is the 404 page, and so is their booking page', async ({ page }) => {
    for (const path of ['/creators/zzzzz', '/creators/d5555', '/creators/d8888', '/creators/not-a-code', '/book/d8888', '/book/d5555', '/book/zzzzz']) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
    }
  })

  test('CP-FR-010 the profile follows the page language and direction', async ({ page }, info) => {
    await page.goto('/creators/d2222')
    if (info.project.name === 'ar-mobile') {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(page.getByTestId('profile-book')).toContainText('احجز مع')
      await expect(page.getByTestId('profile-code').locator('bdi')).toHaveAttribute('dir', 'ltr')
    } else {
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await expect(page.getByTestId('profile-book')).toContainText('Book with Sara Demo')
    }
  })
})

test.describe('CP-US2-S2 booking a creator', () => {
  test('@smoke CP-US2-S2 "Book with this creator" opens the brief with the creator fixed; sending it names them and records them', async ({ page, request }, info) => {
    test.skip(info.project.name === 'nojs' || info.project.name === 'ar-mobile', 'the JavaScript flow in English; the no-JS and Arabic forms are covered below')
    await stubWhatsApp(page)
    await page.goto('/creators/d2222')
    await page.getByTestId('profile-book').click()
    await expect(page).toHaveURL(/\/book\/d2222$/)
    const chip = page.getByTestId('brief-creator-chip')
    await expect(chip).toContainText('Sara Demo')
    await expect(chip).toContainText('CR-D2222')
    // The professional is already answered and locked; the first thing asked is the next step.
    await expect(page.getByTestId('brief-sentence')).toContainText('I need a photographer for')
    await expect(page.getByRole('group', { name: /Professional/ })).toHaveCount(0)
    await expect(page.getByRole('group', { name: /Occasion/ })).toBeVisible()
    await finishBrief(page)

    const popup = page.waitForEvent('popup')
    await page.getByTestId('brief-submit').click()
    await expect(page.getByTestId('brief-success')).toBeVisible({ timeout: 20_000 })
    const reference = (await page.getByTestId('brief-reference').textContent())!.match(/B-[0-9A-Z]{5}/)![0]
    const wa = decodeURIComponent((await page.getByTestId('brief-open-whatsapp').getAttribute('href'))!)
    expect(wa).toContain('I need a photographer for')
    expect(wa).toContain('Creator: Sara Demo (CR-D2222)')
    await (await popup).close()

    const token = await adminToken(request)
    const profiles = await (await request.get('/api/creator-profiles?where[code][equals]=D2222&depth=0', { headers: auth(token) })).json()
    const brief = await (await request.get(`/api/briefs?where[reference][equals]=${reference}&depth=0`, { headers: auth(token) })).json()
    expect(brief.docs[0].creator).toBe(profiles.docs[0].id)
  })

  test('CP-US2-S2 a creator with two types lists only those types and nothing is pre-selected', async ({ page }, info) => {
    await page.goto('/book/d7777')
    const professionals = page.getByRole('group', { name: /Professional|المحترف/ })
    await expect(professionals).toBeVisible()
    await expect(professionals.locator('input[data-row]')).toHaveCount(2)
    await expect(professionals.locator('input:checked')).toHaveCount(0)
    await expect(page.getByTestId('brief-creator-chip')).toContainText('CR-D7777')
    if (info.project.name !== 'nojs') await expect(page.getByTestId('brief-submit')).toBeHidden()
  })

  test('CP-US2-S2 the form carries the creator without JavaScript and the professional is a fixed field', async ({ page }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/book/d2222')
    await expect(page.locator('input[name="creator"]')).toHaveValue('D2222')
    await expect(page.locator('input[type="hidden"][name="persona"]')).toHaveValue('photographer')
    await expect(page.getByTestId('brief-creator-chip')).toBeVisible()
  })

  test('CP-US2-S2 the booking page has no serious a11y issues and the right direction', async ({ page }, info) => {
    test.skip(info.project.name === 'nojs')
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/book/d2222')
    await expect(page.getByTestId('brief-creator-chip')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await expectNoSeriousA11yIssues(page)
    if (info.project.name === 'ar-mobile') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
