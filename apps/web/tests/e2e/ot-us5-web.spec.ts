import { expect, test } from '@playwright/test'
import { a11y, e2ePhone, enterOutboxCode } from './helpers'

/** Feature 009 User Story 5 in the browser, with the console provider (360 and 1440 px, English and Arabic projects). */
test.describe('009 US5 the website signs in by code', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === 'nojs', 'the code step works without JavaScript too, but the outbox helper reads a cookie set by the action')
  })

  test('OT-US5-S1 number → code from the outbox → the header shows the account', async ({ page }, info) => {
    const arabic = info.project.name === 'ar-mobile'
    await page.goto(arabic ? '/ar/login' : '/login')
    await a11y(page, info)
    const phone = page.getByLabel(arabic ? 'رقم الهاتف المتحرك' : 'Mobile number')
    await expect(phone).toHaveAttribute('dir', 'ltr')
    await phone.fill(e2ePhone())
    await page.getByTestId('send-code').click()
    await expect(page.getByLabel(arabic ? 'الرمز المكوّن من ستة أرقام' : 'Six-digit code')).toHaveAttribute('autocomplete', 'one-time-code')
    await a11y(page, info)
    await enterOutboxCode(page)
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByTestId('account-summary')).toContainText('+971')
    const cookie = (await page.context().cookies()).find((c) => c.name === 'payload-token')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('Lax')
  })

  test('OT-US5-S4 /register offers Join as a creator by code; no page offers an email registration', async ({ page }, info) => {
    const arabic = info.project.name === 'ar-mobile'
    for (const path of ['/register', '/login', '/login/email']) {
      await page.goto(arabic ? `/ar${path}` : path)
      await expect(page.locator('input[autocomplete="new-password"]')).toHaveCount(0)
    }
    await page.goto(arabic ? '/ar/register' : '/register')
    await expect(page.getByTestId('phone-step')).toBeVisible()
    await expect(page.getByTestId('accept-terms')).toBeVisible()
    await a11y(page, info)
  })
})
