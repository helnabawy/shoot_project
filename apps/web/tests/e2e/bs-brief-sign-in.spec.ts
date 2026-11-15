import { expect, test } from '@playwright/test'
import { a11y, e2ePhone, enterOutboxCode, finishBriefSteps } from './helpers'

/** Feature 021 in the browser: a guest builds a brief, signs in by code on the way, and lands on step 2. */
test.describe('021 sign in to send a brief', () => {
  test('BS-US1-S1 BS-US1-S2 the guest’s brief is kept through sign-in and sent once they are in', async ({ page }, info) => {
    const arabic = info.project.name === 'ar-mobile'
    const nojs = info.project.name === 'nojs'
    test.skip(nojs, 'the step-by-step bar needs JavaScript; the no-JavaScript round trip is proven in brief-sign-in.int.test.ts (BS-US1-S5)')
    await page.goto(arabic ? '/ar' : '/')
    await page.getByTestId('brief-option-persona-photographer').click()
    const next = page.getByTestId('brief-continue-persona')
    if (await next.isVisible()) await next.click()
    await finishBriefSteps(page)
    await expect(page.getByTestId('brief-sign-in-next')).toBeVisible()
    await page.getByTestId('brief-submit').click()

    await expect(page).toHaveURL(/\/login\?next=%2Fbrief%2Fsend&for=brief$/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(arabic ? 'سجّل الدخول لإرسال طلبك' : 'Log in to send your brief')
    await expect(page.getByTestId('kept-brief')).toContainText(arabic ? 'مصوّر' : 'photographer')
    await a11y(page, info)

    // BS-US3-S1: back on the page, the brief is still built.
    await page.goBack()
    await expect(page.getByTestId('brief-submit')).toBeVisible()
    await page.getByTestId('brief-submit').click()
    await expect(page).toHaveURL(/\/login\?/, { timeout: 20_000 })

    await page.getByLabel(arabic ? 'رقم الهاتف المتحرك' : 'Mobile number').fill(e2ePhone().slice(4))
    await page.getByTestId('send-code').click()
    await enterOutboxCode(page)
    await expect(page).toHaveURL(/\/match\/B-[0-9A-Z]{5}\//, { timeout: 20_000 })
  })
})
