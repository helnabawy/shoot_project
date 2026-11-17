import { expect, test } from '@playwright/test'
import { adminToken, auth, briefToStep2 } from './helpers'

/**
 * Feature 022 journey (OF-US4-S2, OF-US2-S4): two browsers, the client on step 2 and a creator in the inbox.
 * A creator offers; the client's page shows it within a few seconds without a reload. Needs a server whose
 * database has the demo seed and "Creators offer prices" on (this spec turns it on and back off).
 *
 * NOT VERIFIED: marked `fixme` because the creator's sign-in is missing. Email sign-in was removed in 009, so
 * the creator has to sign in by mobile number and a one-time code read from the console outbox
 * (`pnpm --filter web otp:last`); the helper for that is still to be written (tasks.md T061). Until then the
 * live updates are proven by the integration tests (stamps), `LiveRefresh.test.tsx` and the app's poller tests.
 */
test.describe('OF-US4 the client sees an offer arrive live', () => {
  test.afterAll(async ({ request }) => {
    const token = await adminToken(request)
    await request.post('/api/globals/site-settings', { headers: auth(token), data: { quickMatch: { enabled: true, offers: { enabled: false } } } })
  })

  test('OF-US4-S2 OF-US2-S4 the creator offers another price; step 2 shows it without a reload; the creator sees it in the inbox without a reload', async ({ page, browser, request }, info) => {
    test.fixme(true, 'needs a creator OTP sign-in helper (T061)')
    test.skip(info.project.name !== 'desktop', 'one journey is enough; the screens are covered by component tests')
    const token = await adminToken(request)
    const on = await request.post('/api/globals/site-settings', { headers: auth(token), data: { quickMatch: { enabled: true, offers: { enabled: true, feePercent: 10, minPercent: 70, maxPercent: 200 } } } })
    expect(on.ok(), await on.text()).toBeTruthy()

    // The client briefs, names the suggested price and lands on the waiting state.
    await briefToStep2(page)
    const step2 = page.url()
    const ref = step2.match(/\/match\/(B-[0-9A-Z]+)\//)![1]!
    await expect(page.getByTestId('offers-waiting')).toBeVisible()

    // A creator signs in (OTP console provider, see `pnpm --filter web otp:last`) and sees the brief with the client's price.
    const creator = await browser.newContext()
    const inbox = await creator.newPage()
    await inbox.goto(`/account/inbox?brief=${ref}`)
    const card = inbox.locator(`[data-testid="inbox-brief"][data-ref="${ref}"]`)
    await expect(card).toBeVisible()
    await expect(card.getByTestId('inbox-client-price')).toBeVisible()

    // The creator offers a different price; the client's page updates on its own.
    await card.getByTestId('inbox-offer').locator('summary').click()
    await card.getByLabel('Your price').fill('900')
    await card.getByTestId('inbox-offer-send').click()
    await expect(inbox.locator(`[data-testid="inbox-accepted"][data-ref="${ref}"]`)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('offer-card').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('offer-card').first()).toContainText('AED 990')
    await creator.close()
  })
})
