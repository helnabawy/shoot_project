import { expect, test, type Browser } from '@playwright/test'
import { ADMIN, briefToStep2 } from './helpers'

/** Signs a demo creator in with the REST login (the site has no email form any more) in a fresh context. */
async function creatorPage(browser: Browser, email: string) {
  const context = await browser.newContext()
  const login = await context.request.post('/api/users/login', { data: { email, password: ADMIN.password } })
  expect(login.ok(), `sign in ${email}`).toBeTruthy()
  return { page: await context.newPage(), context }
}

test.describe('CH the creator home', () => {
  test('CH-US2-S2 a visitor who is not signed in still gets the landing at /', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('creator-home')).toHaveCount(0)
    await expect(page.getByTestId('brief-option-persona-photographer')).toBeVisible()
  })

  test('CH-US2-S1 CH-US1-S2 CH-US1-S4 a creator lands on their home at /, backs out of Decline, accepts a new brief, and the client sees them first', async ({ page, browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'one journey is enough; the screens are covered by component tests')
    test.slow() // a brief, two sign-ins and several page loads
    // A client sends a Dubai photographer brief and lands on step 2.
    await briefToStep2(page)
    const step2 = page.url()
    const ref = step2.match(/\/match\/(B-[0-9A-Z]+)\//)![1]!

    // Sara (D2222, Dubai Marina) opens the home address: the creator home, the address bar still "/".
    const { page: sara, context } = await creatorPage(browser, 'demo-sara@demo.test')
    await sara.goto('/')
    await expect(sara).toHaveURL((url) => url.pathname === '/')
    await expect(sara.getByTestId('creator-home')).toBeVisible()
    await expect(sara.getByTestId('home-status')).toHaveText('Live')
    const card = sara.locator(`[data-testid="request-card"][data-ref="${ref}"]`)
    await expect(card).toBeVisible()
    await expect(sara.getByTestId('position')).toContainText('1 of')

    // Decline opens the reason step in place; Back records nothing.
    await card.getByTestId('decline').click()
    await expect(sara.getByTestId('decline-step')).toBeVisible()
    await expect(sara.getByTestId('accept')).toHaveCount(0)
    await sara.getByTestId('decline-back').click()
    await expect(sara.getByTestId('decline-step')).toHaveCount(0)
    await expect(sara.locator(`[data-testid="request-card"][data-ref="${ref}"]`)).toBeVisible()

    // Accept: the brief leaves the queue and the client's step 2 lists Sara first, marked.
    await sara.locator(`[data-testid="request-card"][data-ref="${ref}"]`).getByTestId('accept').click()
    await expect(sara.locator(`[data-ref="${ref}"]`)).toHaveCount(0, { timeout: 20_000 })
    await page.goto(step2)
    const first = page.getByTestId('match-creator').first()
    await expect(first).toHaveAttribute('data-code', 'D2222')
    await expect(first.getByTestId('said-yes')).toHaveText('Said yes')
    await context.close()
  })

  test('CH-US2-S3 CH-US2-S1 a creator reaches the client page and back, and the Arabic home reads right to left', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'one journey is enough')
    test.slow() // several first visits in a row
    const { page, context } = await creatorPage(browser, 'demo-sara@demo.test')
    await page.goto('/')
    await expect(page.getByTestId('creator-home')).toBeVisible()
    // The client page is one click away, and the way back too.
    await page.getByRole('link', { name: 'Book a shoot' }).first().click()
    await expect(page).toHaveURL((url) => url.searchParams.get('view') === 'client')
    await expect(page.getByTestId('creator-home')).toHaveCount(0)
    await expect(page.getByTestId('brief-option-persona-photographer')).toBeVisible()
    await page.getByRole('link', { name: 'Creator home' }).first().click()
    await expect(page.getByTestId('creator-home')).toBeVisible()

    // In Arabic (last: the language choice is remembered, so "/" would redirect to "/ar" afterwards).
    await page.goto('/ar')
    await expect(page.getByTestId('creator-home')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByTestId('home-status')).toHaveText('منشور')
    await context.close()
  })

  test('CH-US2-S4 signing out shows the landing at / and signing in shows the creator home, with no navigation in between', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'one journey is enough')
    test.slow()
    const { page, context } = await creatorPage(browser, 'demo-sara@demo.test')
    await page.goto('/')
    await expect(page.getByTestId('creator-home')).toBeVisible()
    expect((await context.request.post('/api/users/logout')).ok()).toBeTruthy()
    await page.goto('/')
    await expect(page.getByTestId('creator-home')).toHaveCount(0)
    await expect(page.getByTestId('brief-option-persona-photographer')).toBeVisible()
    expect((await context.request.post('/api/users/login', { data: { email: 'demo-sara@demo.test', password: ADMIN.password } })).ok()).toBeTruthy()
    await page.goto('/')
    await expect(page.getByTestId('creator-home')).toBeVisible()
    await context.close()
  })

  test('CH-US4-S2 a creator whose profile is in review sees the message and no queue', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'one journey is enough')
    const { page, context } = await creatorPage(browser, 'demo-noor@demo.test')
    await page.goto('/')
    await expect(page.getByTestId('home-status')).toHaveText('In review')
    await expect(page.getByText('Our team is reviewing your profile')).toBeVisible()
    await expect(page.getByTestId('request-card')).toHaveCount(0)
    await expect(page.getByTestId('accept')).toHaveCount(0)
    await context.close()
  })

  test('CH-US2-S2 a creator who is not signed in directly at /creator-home is sent to the landing', async ({ page }) => {
    await page.goto('/creator-home')
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await expect(page.getByTestId('creator-home')).toHaveCount(0)
  })
})
