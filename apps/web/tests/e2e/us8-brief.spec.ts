import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { adminToken, auth } from './helpers'

/** The step being asked (FR-067). */
const asked = (page: Page) => page.locator('[data-current="true"]')

/**
 * Answers whatever step is asked until the brief is complete: Continue when a step waits for it,
 * the skip row of an optional step, otherwise its first row. Independent of the CMS's options.
 */
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

/** Picks the photographer, and moves on when the step takes several professionals. */
async function pickPhotographer(page: Page) {
  await page.getByTestId('brief-option-persona-photographer').click()
  const next = page.getByTestId('brief-continue-persona')
  if (await next.isVisible()) await next.click()
}

/** WhatsApp itself is outside the test; answer its URL locally. */
const stubWhatsApp = (page: Page) =>
  page
    .context()
    .route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, (route) => route.fulfill({ body: 'whatsapp' }))

/** Without JavaScript nothing is pre-filled: choose the first row of every list (the date stays open). */
async function fillEveryList(page: Page) {
  for (const list of await page.locator('[data-group]').all()) {
    const first = list.locator('input[data-row]').first()
    if (await first.count()) await first.check({ force: true })
  }
}

test.describe('US8 step-by-step brief (FR-067)', () => {
  test('@smoke US8-S1/S3 build the brief step by step, send it, get a reference and a WhatsApp chat', async ({
    page,
    request,
  }, info) => {
    test.skip(info.project.name === 'nojs' || info.project.name === 'ar-mobile')
    await stubWhatsApp(page)
    await page.goto('/')
    // One field and only the professional list; no primary action yet.
    await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', "Type what you're looking for")
    await expect(page.getByRole('group', { name: /Professional/ })).toBeVisible()
    await expect(page.getByRole('group', { name: /Occasion/ })).toBeHidden()
    await expect(page.getByTestId('brief-submit')).toBeHidden()

    await pickPhotographer(page)
    await expect(page.getByTestId('brief-sentence')).toContainText('I need a photographer for')
    await expect(page.getByRole('group', { name: /Occasion/ })).toBeVisible()
    await page.getByTestId('brief-option-occasion-wedding-engagement').click()
    await expect(page.getByTestId('brief-sentence')).toContainText('for a wedding or engagement')
    await finishBrief(page)

    const popup = page.waitForEvent('popup')
    await page.getByTestId('brief-submit').click()
    // Saving can take a while on a development server.
    await expect(page.getByTestId('brief-success')).toBeVisible({ timeout: 20_000 })
    const reference = (await page.getByTestId('brief-reference').textContent())!.match(/B-[0-9A-Z]{5}/)![0]
    await expect(page.getByTestId('brief-success')).toContainText('shortly')
    const wa = await page.getByTestId('brief-open-whatsapp').getAttribute('href')
    expect(decodeURIComponent(wa!)).toContain('I need a photographer for a wedding or engagement')
    const tab = await popup
    await expect.poll(() => tab.url()).toContain('wa.me')
    await tab.close()

    const token = await adminToken(request)
    const found = await (
      await request.get(`/api/briefs?where[reference][equals]=${reference}`, { headers: auth(token) })
    ).json()
    expect(found.docs[0].selections.map((s: { token: string; value: string }) => `${s.token}=${s.value}`)).toEqual(
      expect.arrayContaining(['occasion=wedding-engagement', 'persona=photographer']),
    )
  })

  test('US8-S4 nothing can be sent before every step is answered', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop')
    await page.goto('/')
    await pickPhotographer(page)
    await page.getByRole('searchbox').press('Enter')
    await expect(page.getByTestId('brief-submit')).toBeHidden()
    await expect(page.getByTestId('brief-success')).toHaveCount(0)
  })

  test('US8-S5 an option added in the CMS appears on the site', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop')
    const token = await adminToken(request)
    const sets = await (
      await request.get('/api/option-sets?where[slug][equals]=occasions&depth=0', { headers: auth(token) })
    ).json()
    const set = sets.docs[0]
    const value = `graduation-${Date.now()}`
    await request.patch(`/api/option-sets/${set.id}`, {
      headers: auth(token),
      data: { options: [...set.options, { label: 'a graduation', value, order: 1 }] },
    })
    try {
      // Every list is in the page (only the asked one shows), so the new row can be counted.
      await expect
        .poll(
          async () => {
            await page.goto('/')
            return page.getByTestId(`brief-option-occasion-${value}`).count()
          },
          { timeout: 60_000 },
        )
        .toBe(1)
    } finally {
      await request.patch(`/api/option-sets/${set.id}`, {
        headers: auth(token),
        data: { options: set.options },
      })
    }
  })

  test('@smoke US8-S7 the Arabic builder is right-to-left and asks step by step in Arabic', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ar-mobile')
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', 'اكتب ما تبحث عنه')
    await expect(page.getByRole('group', { name: /المحترف/ })).toBeVisible()
    await expect(page.getByRole('group', { name: /المناسبة/ })).toBeHidden()
    await pickPhotographer(page)
    await expect(page.getByTestId('brief-sentence')).toContainText('أحتاج')
    await expect(page.getByRole('group', { name: /المناسبة/ })).toBeVisible()
  })

  test('@smoke US8-S9 without JavaScript every list shows, and the brief is sent to WhatsApp', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/')
    await expect(page.getByRole('group', { name: /Occasion/ })).toBeVisible()
    await fillEveryList(page)
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() >= 300 && r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByTestId('brief-submit').click()
    const redirect = await response
    expect(redirect.headers()['location'] ?? redirect.headers()['x-action-redirect'] ?? '').toContain('wa.me')
  })

  test('US8-S10 one brief for a photographer and a videographer', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop' && info.project.name !== 'mobile')
    await stubWhatsApp(page)
    await page.goto('/')
    await expect(page.getByRole('group', { name: /pick one or more/ })).toBeVisible()
    await page.getByTestId('brief-option-persona-photographer').click()
    await page.getByTestId('brief-option-persona-videographer').click()
    await expect(page.getByTestId('brief-sentence')).toContainText('I need a photographer and videographer')
    await page.getByTestId('brief-continue-persona').click()
    await finishBrief(page)
    const popup = page.waitForEvent('popup')
    await page.getByTestId('brief-submit').click()
    // Saving can take a while on a development server.
    await expect(page.getByTestId('brief-success')).toBeVisible({ timeout: 20_000 })
    const reference = (await page.getByTestId('brief-reference').textContent())!.match(/B-[0-9A-Z]{5}/)![0]
    const wa = await page.getByTestId('brief-open-whatsapp').getAttribute('href')
    expect(decodeURIComponent(wa!)).toContain('photographer and videographer')
    await (await popup).close()

    const token = await adminToken(request)
    const found = await (
      await request.get(`/api/briefs?where[reference][equals]=${reference}&depth=1`, { headers: auth(token) })
    ).json()
    expect(found.docs[0].persona.map((p: { slug: string }) => p.slug)).toEqual(['photographer', 'videographer'])
  })

  test('US8-S10 without JavaScript both types are sent', async ({ page }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/')
    await fillEveryList(page)
    await page.getByTestId('brief-option-persona-videographer').locator('input').check({ force: true })
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() >= 300 && r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByTestId('brief-submit').click()
    const redirect = await response
    const target = decodeURIComponent(redirect.headers()['location'] ?? redirect.headers()['x-action-redirect'] ?? '')
    expect(target).toContain('photographer and videographer')
  })

  test('FR-064 FR-065 US8-S11/S12/S13 a word reopens its step, Backspace takes an answer back, Cmd/Ctrl+K finds the field', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop')
    await page.goto('/')
    await pickPhotographer(page)
    const professional = page.getByRole('group', { name: /Professional/ })
    const occasion = page.getByRole('group', { name: /Occasion/ })
    await expect(professional).toBeHidden()
    await expect(occasion).toBeVisible()

    await page.getByTestId('brief-sentence').getByRole('link', { name: 'photographer' }).click()
    await expect(professional).toBeVisible()
    await expect(occasion).toBeHidden()
    await expect(page.getByTestId('brief-option-persona-photographer').locator('input')).toBeFocused()

    await page.keyboard.press('ControlOrMeta+k')
    await expect(page.getByRole('searchbox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(occasion).toBeVisible()
    await page.keyboard.press('Backspace')
    await expect(professional).toBeVisible()
    await expect(page.getByTestId('brief-sentence')).not.toContainText('photographer')
  })
})
