import { expect, test } from '@playwright/test'
import { a11y, inEnglish } from './helpers'

// Demo seed (SEED_DEMO_GUIDES=1 with SEED_DEMO_CREATORS=1): /hire/proposal-photographer-dubai is about a
// photographer in Dubai, with one explicit answer (occasion) and two questions.
test.describe('MP-US4 intent pages', () => {
  test('@smoke MP-US4-S1 the brief opens with the answers the page is about, still changeable', async ({ page }, info) => {
    test.skip(info.project.name === 'nojs', 'the builder is a JavaScript island; the no-JS form is covered by the brief specs')
    await inEnglish(page, info, test.skip)
    await page.goto('/hire/proposal-photographer-dubai')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proposal photographer in Dubai')
    const sentence = page.getByTestId('brief-sentence')
    await expect(sentence).toContainText('photographer')
    await expect(sentence).toContainText('Dubai')
    await page.getByTestId('brief-sentence').getByRole('link', { name: 'Dubai' }).click()
    await expect(page.getByRole('radio', { name: /Abu Dhabi/ })).toBeVisible()
    await a11y(page, info)
  })

  test('MP-US4-S3 carries FAQ and Service structured data and its own title', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/hire/proposal-photographer-dubai')
    const types = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.flatMap((e) => [JSON.parse(e.textContent ?? '[]')].flat().map((x: { '@type': string }) => x['@type'])))
    expect(types).toEqual(['FAQPage', 'Service'])
    await expect(page).toHaveTitle(/Proposal photographer in Dubai/)
    await expect(page.getByTestId('intent-faq')).toContainText('How far ahead should I book?')
  })

  test('MP-US4-S4 shows real matching creators and no invented ones', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/hire/proposal-photographer-dubai')
    const codes = await page.locator('[data-testid="intent-creators"] [data-code], [data-testid="intent-creators"][data-code]').evaluateAll((els) => els.map((e) => e.getAttribute('data-code')))
    expect(codes.length).toBeGreaterThan(0)
    for (const hidden of ['D5555', 'D8888']) expect(codes).not.toContain(hidden)
  })

  test('MP-US4-S1 in Arabic the page is right-to-left and keeps the preset', async ({ page }) => {
    await page.goto('/ar/hire/proposal-photographer-dubai')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('brief-sentence')).toContainText('دبي')
  })

  test('MP-US4-S1 a standard page address is not an intent page', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    expect((await page.goto('/hire/studios'))?.status()).toBe(404)
    expect((await page.goto('/proposal-photographer-dubai'))?.status()).toBe(404)
  })
})
