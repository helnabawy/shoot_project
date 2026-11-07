import { expect, test } from '@playwright/test'
import { briefToStep2, expectNoSeriousA11yIssues } from './helpers'

// Runs on the demo seed (demo creators and demo prices, playwright.config.ts).
test.describe('QM-US1 see who is free and pick a creator', () => {
  test('@smoke QM-US1-S1 QM-FR-008 brief → step 2 lists free creators under one price → choose', async ({ page }, info) => {
    await briefToStep2(page, '/', { nojs: info.project.name === 'nojs' })
    const rows = page.getByTestId('match-creator')
    await expect(rows.first()).toBeVisible()
    await expect(page.getByRole('group', { name: /AED|د\.إ/ }).first()).toBeVisible()
    await expect(page.getByTestId('match-any')).toBeVisible()
    await expectNoSeriousA11yIssues(page)
    await rows.first().click()
    await expect(page).toHaveURL(/\/details\?pick=photographer%3A/)
    await expect(page.getByTestId('details-submit')).toBeVisible()
  })

  test('QM-US1-S2 a bad link shows the 404, never another brief', async ({ page }) => {
    const res = await page.goto('/match/B-ZZZZZ/' + 'x'.repeat(43))
    expect(res?.status()).toBe(404)
  })

  test('step 2 sends no Referer with its private key', async ({ page }, info) => {
    await briefToStep2(page, '/', { nojs: info.project.name === 'nojs' })
    const res = await page.reload()
    expect(res?.headers()['referrer-policy']).toBe('no-referrer')
    expect(res?.headers()['x-robots-tag']).toContain('noindex')
  })
})
