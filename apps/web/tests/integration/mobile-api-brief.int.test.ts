import { addDays, dubaiToday } from '@shoot/domain/booking'
import { briefBuilderV1, briefReceiptV1, problemV1 } from '@shoot/domain/api/v1'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as briefBuilder } from '@/app/(payload)/api/mobile/v1/brief-builder/route'
import { POST as recordBrief } from '@/app/(payload)/api/mobile/v1/briefs/route'
import { mintSession } from '@/modules/auth/otp/mint'
import { seed } from '@/shared/payload/seed/seed'
import { bearer, call } from './setup/otp'
import { createUser, getTestPayload, quiet, resetDatabase } from './setup/payload'

vi.mock('next-intl/server', async () => await import('../setup/server-intl'))

/** Feature 021 over `/api/mobile/v1` (contracts/mobile-api.md): `POST briefs` needs a member while the switch is on. */
describe('021 the app sends a brief only when signed in', () => {
  const body = () => ({
    selections: [
      { token: 'persona', value: 'photographer' },
      { token: 'occasion', value: 'event' },
      { token: 'duration', value: '2h' },
      { token: 'location', value: 'dubai' },
      { token: 'shotBy', value: 'anyone' },
    ],
    date: addDays(dubaiToday(new Date()), 10),
  })
  const install = () => ({ 'x-shoot-install': crypto.randomUUID() })
  const count = async () => (await getTestPayload()).count({ collection: 'briefs', overrideAccess: true })
  const setSwitch = async (on: boolean) =>
    (await getTestPayload()).updateGlobal({ slug: 'site-settings', data: { briefNeedsSignIn: on } as never, context: quiet })
  let token: string
  let memberId: number

  beforeAll(async () => {
    await resetDatabase()
    const payload = await getTestPayload()
    await seed(payload, { log: () => {} })
    const member = await createUser()
    memberId = member.id
    token = (await mintSession(payload, member.id)).token
  })
  beforeEach(() => setSwitch(true))

  it('BS-US4-S1 GET brief-builder tells the app whether sending needs sign-in', async () => {
    const on = briefBuilderV1.parse(await (await call(briefBuilder, 'brief-builder', { method: 'GET' })).json())
    expect(on.signInRequired).toBe(true)
    await setSwitch(false)
    const off = briefBuilderV1.parse(await (await call(briefBuilder, 'brief-builder', { method: 'GET' })).json())
    expect(off.signInRequired).toBe(false)
  })

  it('BS-US5-S4 a brief without a signed-in member is refused with signInRequired, nothing recorded', async () => {
    const before = (await count()).totalDocs
    const res = await call(recordBrief, 'briefs', { body: body(), headers: install() })
    expect(res.status).toBe(401)
    expect(problemV1.parse(await res.json()).code).toBe('brief.errors.signInRequired')
    expect((await count()).totalDocs).toBe(before)
  })

  it('BS-US4-S2 a signed-in member records the brief, linked to them, with the step-2 path', async () => {
    const res = await call(recordBrief, 'briefs', { body: body(), headers: { ...install(), ...bearer(token) } })
    expect(res.status).toBe(200)
    const receipt = briefReceiptV1.parse(await res.json())
    expect(receipt.matchPath).toMatch(/^\/match\/B-[0-9A-Z]{5}\//)
    const payload = await getTestPayload()
    const brief = (await payload.find({ collection: 'briefs', where: { reference: { equals: receipt.reference } }, overrideAccess: true, depth: 0 })).docs[0]!
    expect(brief.member).toBe(memberId)
  })

  it('BS-US5-S3 with the switch off a guest records as before this feature', async () => {
    await setSwitch(false)
    const res = await call(recordBrief, 'briefs', { body: body(), headers: install() })
    expect(res.status).toBe(200)
    expect(briefReceiptV1.parse(await res.json()).reference).toMatch(/^B-/)
  })
})
