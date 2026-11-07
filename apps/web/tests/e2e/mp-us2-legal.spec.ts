import { expect, test } from '@playwright/test'
import { a11y, inEnglish, uniqueEmail } from './helpers'

const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'e2e-password-123'

test.describe('MP-US2 legal pages', () => {
  test('@smoke MP-US2-S1 the footer links the three documents, each at its fixed address with a version and a date', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    for (const [name, path] of [['Terms & Conditions', '/terms'], ['Professional Terms', '/terms/professional'], ['Privacy Policy', '/privacy']] as const) {
      await page.goto('/')
      const legal = page.getByTestId('footer-legal')
      await expect(legal.getByRole('link')).toHaveCount(3)
      await legal.getByRole('link', { name }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 30_000 })
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
      await expect(page.getByTestId('legal-view')).toContainText(/Version 1 · applies from/)
      await a11y(page, info)
    }
  })

  test('MP-US2-S4 the list of versions shows the first version and opens it', async ({ page }, info) => {
    await inEnglish(page, info, test.skip)
    await page.goto('/terms/versions')
    await expect(page.getByTestId('legal-versions').getByRole('listitem')).toHaveCount(1)
    await page.getByRole('link', { name: 'Version 1' }).click()
    await expect(page).toHaveURL(/\/terms\/versions\/1$/)
    await expect(page.getByTestId('legal-view')).toContainText('applied from')
  })

  test('MP-US2-S1 in Arabic the documents are right-to-left under /ar', async ({ page }) => {
    await page.goto('/ar/privacy')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('legal-view')).toBeVisible()
  })

  test('@smoke MP-US2-S2 registration states acceptance with links, refuses without it and accepts with it', async ({ page }, info) => {
    test.skip(info.project.name === 'nojs', 'the sign-up redirect is covered by the other projects')
    await inEnglish(page, info, test.skip)
    await page.goto('/register')
    const accept = page.getByTestId('accept-terms')
    await expect(accept.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
    await expect(accept.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    await page.getByLabel('Full name').fill('Legal Seeker')
    await page.getByLabel('Email').fill(uniqueEmail('legal'))
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByTestId('register-submit').click()
    await expect(page).toHaveURL(/\/register/) // the required checkbox stops the sign-up
    await accept.getByRole('checkbox').check()
    await page.getByTestId('register-submit').click()
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 })
  })
})
