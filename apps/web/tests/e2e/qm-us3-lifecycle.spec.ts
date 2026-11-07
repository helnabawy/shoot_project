import { expect, test } from '@playwright/test'
import { ADMIN, adminToken, auth, briefToStep2, inDays } from './helpers'

test.describe('QM-US3 the creator confirms and the booking proceeds', () => {
  test('QM-US3-S1 QM-US3-S4 accept → creator confirms → payment recorded → scheduled → delivered → client confirms', async ({ page, browser, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'one full journey is enough; the screens are covered per project elsewhere')
    await briefToStep2(page)
    // Sara Al Mansoori (D2222) works in Dubai Marina, so she is listed for a Dubai brief.
    await page.locator('[data-testid="match-creator"][data-code="D2222"]').click()
    await page.getByLabel('Your name').fill('Layla Hassan')
    await page.getByLabel('WhatsApp number').fill('+971501234567')
    const date = page.getByLabel('Shoot date')
    // A day of its own, so a re-run never finds Sara already booked (first confirmation wins).
    if (await date.isVisible()) await date.fill(inDays(40 + Math.floor(Math.random() * 300)))
    await page.getByTestId('details-submit').click()
    await expect(page).toHaveURL(/\/q\/Q-/)
    const quoteUrl = page.url()
    const reference = quoteUrl.match(/Q-[0-9A-Z]{5}/)![0]
    await page.getByTestId('quote-accept').click()
    await expect(page.getByTestId('booking-status')).toHaveAttribute('data-state', 'accepted')

    // The creator answers in their own account (demo creators sign in with the seed admin password).
    const creator = await browser.newContext()
    expect((await creator.request.post('/api/users/login', { data: { email: 'demo-sara@demo.test', password: ADMIN.password } })).ok()).toBeTruthy()
    const creatorPage = await creator.newPage()
    await creatorPage.goto('/account/bookings')
    const row = creatorPage.locator(`[data-testid="creator-booking"][data-reference="${reference}"]`)
    await row.getByTestId('creator-confirm').click()
    await expect(row.getByTestId('creator-confirm')).toHaveCount(0, { timeout: 20_000 })
    await page.goto(quoteUrl)
    await expect(page.getByTestId('booking-status')).toHaveAttribute('data-state', 'confirmed')
    await expect(page.getByTestId('quote-receipt')).toHaveAttribute('href', /wa\.me/)

    // An admin records the transfer; the clock reaches the shoot day; the creator delivers.
    const token = await adminToken(request)
    const booking = (await (await request.get(`/api/bookings?where[reference][equals]=${reference}&depth=0`, { headers: auth(token) })).json()).docs[0] as { id: number; date: string }
    expect((await request.post('/api/payments', { headers: auth(token), data: { booking: booking.id, kind: 'received', amount: 800, method: 'bank-transfer', note: 'E2E' } })).ok()).toBeTruthy()
    const clock = await request.get('/api/cron/bookings', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, 'x-test-now': `${booking.date}T08:00:00+04:00` } })
    expect(clock.ok()).toBeTruthy()
    await creatorPage.goto('/account/bookings')
    await row.getByTestId('creator-delivered').click()
    await expect(row.getByTestId('creator-delivered')).toHaveCount(0, { timeout: 20_000 })

    await page.goto(quoteUrl)
    await page.getByTestId('quote-confirm-delivery').click()
    await expect(page.getByTestId('booking-status')).toHaveAttribute('data-state', 'completed')
    await creator.close()
  })
})
