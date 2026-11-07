import { expect, test } from '@playwright/test'
import { expectNoSeriousA11yIssues } from './helpers'

test.describe('US7 light and dark', () => {
  test('@smoke US7-S1 a dark device gets the dark theme from the first paint', async ({ page }, info) => {
    test.skip(info.project.name !== 'dark')
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        ;(window as unknown as { __first: string }).__first = getComputedStyle(document.body).backgroundColor
        ;(window as unknown as { __class: string }).__class = document.documentElement.className
      })
    })
    await page.goto('/')
    const first = await page.evaluate(() => (window as unknown as { __first: string }).__first)
    expect(first).toBe('rgb(20, 20, 22)')
    expect(await page.evaluate(() => (window as unknown as { __class: string }).__class)).toContain('dark')
  })

  test('@smoke US7-S2 the toggle applies at once and is remembered', async ({ page }, info) => {
    test.skip(info.project.name !== 'dark')
    await page.goto('/')
    await page.getByTestId('theme-toggle').first().getByRole('button', { name: 'Light' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.goto('/login')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.getByTestId('theme-toggle').first().getByRole('button', { name: 'System' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('US7-S3 dark pages have no serious accessibility violations', async ({ page }, info) => {
    test.skip(info.project.name !== 'dark')
    for (const url of ['/', '/login', '/register']) {
      await page.goto(url)
      await expectNoSeriousA11yIssues(page)
    }
  })

  test('without JavaScript there is no broken toggle and the device setting applies', async ({ page }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.getByTestId('theme-toggle').first()).toBeHidden()
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(20, 20, 22)')
  })
})
