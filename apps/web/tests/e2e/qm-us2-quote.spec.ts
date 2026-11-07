import { expect, test, type Page } from '@playwright/test'
import { briefToStep2, expectNoSeriousA11yIssues, inTenDays, uniqueEmail } from './helpers'

async function details(page: Page, code?: string) {
  await page.getByTestId('match-any').click()
  await expect(page).toHaveURL(/\/details/)
  await page.getByLabel(/Your name|اسمك/).fill('Layla Hassan')
  await page.getByLabel(/WhatsApp number|رقم واتساب/).fill('+971501234567')
  const date = page.getByLabel(/Shoot date|تاريخ التصوير/)
  if (await date.isVisible()) await date.fill(inTenDays())
  if (code) {
    await page.getByText(/Have a code\?|لديك رمز؟/).click()
    await page.getByLabel(/Promo code|رمز الخصم/).fill(code)
  }
  await page.getByTestId('details-submit').click()
  await expect(page).toHaveURL(/\/q\/Q-[0-9A-Z]{5}\//, { timeout: 20_000 })
}

test.describe('QM-US2 leave details and receive a quotation', () => {
  test('@smoke QM-US2-S1 QM-US2-S2 QM-US2-S3 details → quotation with WELCOME20 → print layout → accept', async ({ page }, info) => {
    await briefToStep2(page, '/', { nojs: info.project.name === 'nojs' })
    await details(page, 'WELCOME20')
    await expect(page.getByTestId('quote-lines')).toContainText(/WELCOME20/)
    await expect(page.getByTestId('quote-total')).toContainText(/AED|د\.إ/)
    await expectNoSeriousA11yIssues(page)
    if (info.project.name !== 'nojs') {
      await page.emulateMedia({ media: 'print' })
      await expect(page.locator('header').first()).toBeHidden()
      await expect(page.getByTestId('quote-accept')).toBeHidden()
      await page.emulateMedia({ media: 'screen' })
    }
    await page.getByTestId('quote-accept').click()
    await expect(page.getByTestId('booking-status')).toHaveAttribute('data-state', 'accepted')
  })

  test('QM-US2-S6 a member finds the quotation in their account', async ({ page }, info) => {
    const email = uniqueEmail('client')
    const created = await page.request.post('/api/users', { data: { name: 'E2E Client', email, password: 'e2e-password-123', accountType: 'seeker' } })
    expect(created.ok()).toBeTruthy()
    expect((await page.context().request.post('/api/users/login', { data: { email, password: 'e2e-password-123' } })).ok()).toBeTruthy()
    await briefToStep2(page, '/', { nojs: info.project.name === 'nojs' })
    await details(page)
    const reference = page.url().match(/Q-[0-9A-Z]{5}/)![0]
    await page.goto('/account/bookings')
    await expect(page.getByTestId('my-booking').filter({ hasText: reference })).toBeVisible()
  })
})
