import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { adminToken, auth } from './helpers'

/** With JavaScript the options start folded under the sentence; the toggle opens them. */
const openOptions = (page: Page) => page.getByTestId('brief-toggle').click()

test.describe('US8 brief builder', () => {
  test('@smoke US8-S1/S3 pick words, send, get a reference and a WhatsApp chat with the sentence', async ({
    page,
    request,
  }, info) => {
    test.skip(info.project.name === 'nojs' || info.project.name === 'ar-mobile')
    // WhatsApp itself is outside the test; answer its URL locally.
    await page
      .context()
      .route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, (route) =>
        route.fulfill({ body: 'whatsapp' }),
      )
    await page.goto('/')
    await openOptions(page)
    await page.getByTestId('brief-option-occasion-wedding-engagement').click()
    await page
      .getByTestId('brief-option-location-sharjah')
      .click({ force: true })
      .catch(async () => {
        await page
          .getByText(/Show \d+ more/)
          .nth(2)
          .click()
        await page.getByTestId('brief-option-location-sharjah').click()
      })
    await expect(page.getByTestId('brief-sentence')).toContainText('for a wedding or engagement')
    const popup = page.waitForEvent('popup')
    await page.getByTestId('brief-submit').click()
    await expect(page.getByTestId('brief-success')).toBeVisible()
    const reference = (await page.getByTestId('brief-reference').textContent())!.match(
      /B-[0-9A-Z]{5}/,
    )![0]
    await expect(page.getByTestId('brief-success')).toContainText('shortly')
    const wa = await page.getByTestId('brief-open-whatsapp').getAttribute('href')
    expect(decodeURIComponent(wa!)).toContain('I need a photographer for a wedding or engagement')
    const tab = await popup
    await expect.poll(() => tab.url()).toContain('wa.me')
    await tab.close()

    const token = await adminToken(request)
    const found = await (
      await request.get(`/api/briefs?where[reference][equals]=${reference}`, {
        headers: auth(token),
      })
    ).json()
    expect(
      found.docs[0].selections.map(
        (s: { token: string; value: string }) => `${s.token}=${s.value}`,
      ),
    ).toEqual(expect.arrayContaining(['occasion=wedding-engagement', 'persona=photographer']))
  })

  test('US8-S4 a missing required part is pointed out and nothing is sent', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop')
    await page.goto('/')
    await page.getByRole('searchbox').fill('zzzz-no-match')
    await page.getByRole('searchbox').press('Escape')
    await page.evaluate(() => {
      const radio = document.querySelector<HTMLInputElement>('input[name="duration"]:checked')
      if (radio) radio.checked = false
    })
    await page.getByTestId('brief-submit').click()
    await expect(page.getByTestId('brief-success')).toHaveCount(0)
  })

  test('US8-S5 an option added in the CMS appears on the site', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop')
    const token = await adminToken(request)
    const sets = await (
      await request.get('/api/option-sets?where[slug][equals]=occasions&depth=0', {
        headers: auth(token),
      })
    ).json()
    const set = sets.docs[0]
    const value = `graduation-${Date.now()}`
    await request.patch(`/api/option-sets/${set.id}`, {
      headers: auth(token),
      data: { options: [...set.options, { label: 'a graduation', value, order: 1 }] },
    })
    try {
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

  test('@smoke US8-S7 the Arabic builder is right-to-left with Arabic words', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ar-mobile')
    await page.goto('/ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('brief-sentence')).toContainText('أحتاج')
    await expect(page.getByRole('group', { name: 'المناسبة' })).toBeHidden()
    await openOptions(page)
    await expect(page.getByRole('group', { name: 'المناسبة' })).toBeVisible()
  })

  test('@smoke US8-S9 without JavaScript the brief is sent and the visitor lands on WhatsApp', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/')
    await page
      .getByTestId('brief-option-location-dubai')
      .locator('input')
      .check({ force: true })
      .catch(() => {})
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() >= 300 && r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByTestId('brief-submit').click()
    const redirect = await response
    expect(
      redirect.headers()['location'] ?? redirect.headers()['x-action-redirect'] ?? '',
    ).toContain('wa.me')
  })

  test('US8-S10 one brief for a photographer and a videographer', async ({
    page,
    request,
  }, info) => {
    test.skip(info.project.name !== 'desktop' && info.project.name !== 'mobile')
    await page
      .context()
      .route(/https:\/\/(wa\.me|api\.whatsapp\.com)\/.*/, (route) =>
        route.fulfill({ body: 'whatsapp' }),
      )
    await page.goto('/')
    await openOptions(page)
    await expect(page.getByRole('group', { name: /pick one or more/ })).toBeVisible()
    await page.getByTestId('brief-option-persona-videographer').click()
    await expect(page.getByTestId('brief-sentence')).toContainText(
      'I need a photographer and videographer',
    )
    await page
      .getByTestId('brief-option-location-sharjah')
      .click({ force: true })
      .catch(async () => {
        await page
          .getByText(/Show \d+ more/)
          .nth(2)
          .click()
        await page.getByTestId('brief-option-location-sharjah').click()
      })
    const popup = page.waitForEvent('popup')
    await page.getByTestId('brief-submit').click()
    await expect(page.getByTestId('brief-success')).toBeVisible()
    const reference = (await page.getByTestId('brief-reference').textContent())!.match(
      /B-[0-9A-Z]{5}/,
    )![0]
    const wa = await page.getByTestId('brief-open-whatsapp').getAttribute('href')
    expect(decodeURIComponent(wa!)).toContain('photographer and videographer')
    await (await popup).close()

    const token = await adminToken(request)
    const found = await (
      await request.get(`/api/briefs?where[reference][equals]=${reference}&depth=1`, {
        headers: auth(token),
      })
    ).json()
    expect(found.docs[0].persona.map((p: { slug: string }) => p.slug)).toEqual([
      'photographer',
      'videographer',
    ])
  })

  test('US8-S10 without JavaScript both types are sent', async ({ page }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/')
    await page
      .getByTestId('brief-option-persona-videographer')
      .locator('input')
      .check({ force: true })
    await page
      .getByTestId('brief-option-location-dubai')
      .locator('input')
      .check({ force: true })
      .catch(() => {})
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() >= 300 && r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByTestId('brief-submit').click()
    const redirect = await response
    const target = decodeURIComponent(
      redirect.headers()['location'] ?? redirect.headers()['x-action-redirect'] ?? '',
    )
    expect(target).toContain('photographer and videographer')
  })

  test('FR-064 FR-065 US8-S11/S12 the options start folded; a sentence part opens its group and Cmd/Ctrl+K toggles them', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop')
    await page.goto('/')
    const occasion = page.getByRole('group', { name: 'Occasion' })
    await expect(occasion).toBeHidden()
    await expect(page.getByTestId('brief-submit')).toBeVisible()
    await page.getByTestId('brief-sentence').getByRole('link', { name: 'an event' }).click()
    await expect(occasion).toBeVisible()
    await expect(occasion).toBeInViewport()
    await expect(page.getByTestId('brief-option-occasion-event').locator('input')).toBeFocused()
    await page.keyboard.press('ControlOrMeta+k')
    await expect(occasion).toBeHidden()
    await page.keyboard.press('ControlOrMeta+k')
    await expect(occasion).toBeVisible()
    await expect(page.getByRole('searchbox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(occasion).toBeHidden()
  })
})
