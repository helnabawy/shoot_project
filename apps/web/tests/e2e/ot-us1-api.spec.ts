import { authTokenV1, meV1, otpChallengeV1 } from '@shoot/domain/api/v1'
import { expect, test } from '@playwright/test'
import { e2ePhone, readOutboxCode } from './helpers'

/** Feature 009 through the built server and the console provider's outbox (no phone needed). */
test.describe('009 the sign-in API end to end', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'an API flow: one project is enough')
  })

  test('OT-US1-S2 OT-US3-S3 request → outbox code → verify → me → logout → me is 401', async ({ request }) => {
    const phone = e2ePhone()
    const requested = await request.post('/api/mobile/v1/auth/otp/request', { data: { phone, channel: 'sms' } })
    expect(requested.status()).toBe(202)
    expect(requested.headers()['cache-control']).toBe('no-store')
    const challenge = otpChallengeV1.parse(await requested.json())
    const code = await readOutboxCode(challenge.challengeId)

    const verified = await request.post('/api/mobile/v1/auth/otp/verify', { data: { challengeId: challenge.challengeId, phone, code } })
    expect(verified.status()).toBe(200)
    const { token, isNew } = authTokenV1.parse(await verified.json())
    expect(isNew).toBe(true)
    const bearer = { Authorization: `Bearer ${token}` }

    const me = await request.get('/api/mobile/v1/me', { headers: bearer })
    expect(me.status()).toBe(200)
    expect(me.headers()['cache-control']).toBe('private, no-store')
    expect(meV1.parse(await me.json()).phone).toBe(phone)

    expect((await request.post('/api/mobile/v1/auth/logout', { headers: bearer })).status()).toBe(204)
    const after = await request.get('/api/mobile/v1/me', { headers: bearer })
    expect(after.status()).toBe(401)
    expect((await after.json()).code).toBe('api.errors.tokenInvalid')
  })
})
