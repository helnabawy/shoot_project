import { expect, test } from '@playwright/test'
import { ADMIN, briefToStep2 } from './helpers'

test.describe('BI-US2 a creator says yes; the client sees them first', () => {
  test('BI-US2-S1 BI-US2-S3 Sara accepts on /account/inbox; the client’s step 2 lists her first, marked "Said yes"', async ({ page, browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'one journey is enough; the screens are covered by component tests')
    // A client sends a Dubai photographer brief and lands on step 2.
    await briefToStep2(page)
    const step2 = page.url()
    const ref = step2.match(/\/match\/(B-[0-9A-Z]+)\//)![1]!

    // Sara (D2222, Dubai Marina) sees it in her inbox and says yes.
    const creator = await browser.newContext()
    expect((await creator.request.post('/api/users/login', { data: { email: 'demo-sara@demo.test', password: ADMIN.password } })).ok()).toBeTruthy()
    const inbox = await creator.newPage()
    await inbox.goto('/account/inbox')
    const card = inbox.locator(`[data-testid="inbox-brief"][data-ref="${ref}"]`)
    await expect(card).toBeVisible()
    await card.getByTestId('inbox-accept').click()
    await expect(inbox.locator(`[data-testid="inbox-accepted"][data-ref="${ref}"]`)).toBeVisible({ timeout: 20_000 })

    // The client's step 2 now lists Sara first, marked.
    await page.goto(step2)
    const first = page.getByTestId('match-creator').first()
    await expect(first).toHaveAttribute('data-code', 'D2222')
    await expect(first.getByTestId('said-yes')).toHaveText('Said yes')

    // In Arabic too.
    await page.goto(step2.replace('/match/', '/ar/match/'))
    await expect(page.getByTestId('match-creator').first().getByTestId('said-yes')).toHaveText('وافق على طلبك')
    await creator.close()
  })
})
