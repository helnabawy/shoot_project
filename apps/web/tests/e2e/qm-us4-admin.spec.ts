import { expect, test } from '@playwright/test'
import { ADMIN, adminToken, auth } from './helpers'

test.describe('QM-US4 admin oversight', () => {
  test('QM-US4-S1 QM-US4-S3 admins list bookings by state, open one with its records, and export CSV', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'the admin is a desktop tool')
    const token = await adminToken(request)
    const list = await request.get('/api/bookings?limit=1&depth=0', { headers: auth(token) })
    expect(list.ok()).toBeTruthy()
    const first = (await list.json()).docs[0] as { id: number; state: string } | undefined
    test.skip(!first, 'needs at least one booking (run the QM-US2 spec first)')

    expect((await page.context().request.post('/api/users/login', { data: ADMIN })).ok()).toBeTruthy()
    await page.goto(`/admin/collections/bookings?where[state][equals]=${first!.state}`)
    await expect(page.getByRole('link', { name: new RegExp(`Download CSV \\(${first!.state}\\)`) })).toBeVisible({ timeout: 20_000 })
    await page.goto(`/admin/collections/bookings/${first!.id}`)
    await expect(page.getByText('Quotations').first()).toBeVisible()
    const csv = await request.get(`/api/bookings/export.csv?state=${first!.state}`, { headers: auth(token) })
    expect(csv.ok()).toBeTruthy()
    expect(await csv.text()).toContain('reference,state,date')
  })
})
