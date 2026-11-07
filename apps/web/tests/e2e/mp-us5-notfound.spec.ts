import { expect, test } from '@playwright/test'
import { a11y, inEnglish } from './helpers'

test.describe('MP-US5 not found', () => {
  test('@smoke MP-US5-S1 an unknown address is a designed page with a 404 status and next steps', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    const response = await page.goto('/nothing-lives-here')
    expect(response?.status()).toBe(404)
    await expect(page.getByTestId('not-found')).toHaveAttribute('data-variant', 'notFound')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
    await expect(page.getByTestId('not-found').getByRole('link', { name: /Start a brief/ })).toHaveAttribute('href', '/')
    await expect(page.getByTestId('not-found').getByRole('link', { name: /Read the guides/ })).toHaveAttribute('href', '/guides')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await a11y(page, info)
  })

  test('MP-US5-S1 in Arabic it speaks Arabic', async ({ page }) => {
    const response = await page.goto('/ar/nothing-lives-here')
    expect(response?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('الصفحة غير موجودة')
  })

  test('MP-US5-S2 an address that used to be a guide says it has been removed (Local API in setup removes one)', async ({ page, request }) => {
    test.skip(!process.env.REMOVED_PATH_FIXTURE, 'needs a removed address; covered by the integration tests and the component tests')
    const response = await page.goto(process.env.REMOVED_PATH_FIXTURE as string)
    expect(response?.status()).toBe(404)
    await expect(page.getByTestId('not-found')).toHaveAttribute('data-variant', 'removed')
    void request
  })
})
