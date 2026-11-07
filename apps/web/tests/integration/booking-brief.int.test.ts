import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor, form, redirectOf } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { getBriefByKey } = await import('@/modules/booking/match')

describe('QM-FR-001 the brief starts Quick Match', () => {
  let world: BookingWorld
  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => asVisitor())

  const setEnabled = async (enabled: boolean) => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled } } as never, context: quiet })
  }

  it('with Quick Match on, the brief gets a private link to step 2 and keeps WhatsApp', async () => {
    await setEnabled(true)
    const brief = await briefFor(submitBrief as never, world)
    expect(brief.url).toMatch(/^\/match\/B-[A-Z0-9]{5}\/[A-Za-z0-9_-]{43}$/)
    expect(await getBriefByKey(brief.ref, brief.key)).toMatchObject({ reference: brief.ref })
    // The salt is never readable through the API.
    const payload = await getTestPayload()
    const anyone = await payload.find({ collection: 'briefs', where: { reference: { equals: brief.ref } }, user: world.admin, overrideAccess: false, depth: 0 })
    expect(anyone.docs[0]).not.toHaveProperty('accessSalt')
  })

  it('a wrong key, another brief\'s key or an unknown reference finds nothing', async () => {
    await setEnabled(true)
    const a = await briefFor(submitBrief as never, world)
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: 'portrait' })
    expect(await getBriefByKey(a.ref, b.key)).toBeNull()
    expect(await getBriefByKey(a.ref, 'x'.repeat(43))).toBeNull()
    expect(await getBriefByKey('B-ZZZZZ', a.key)).toBeNull()
  })

  it('an Arabic brief links to /ar/match and a no-JS submit redirects there', async () => {
    await setEnabled(true)
    const url = await redirectOf(() =>
      submitBrief({ status: 'idle' }, form({ locale: 'ar', sourcePath: '/ar', persona: 'photographer', occasion: 'event', date: world.date, duration: '2h', location: 'dubai', shotBy: 'anyone' })),
    )
    expect(url).toMatch(/^\/ar\/match\/B-/)
  })

  it('a replayed brief within a minute keeps its record and gets a working new link', async () => {
    await setEnabled(true)
    const first = await briefFor(submitBrief as never, world, { occasion: 'clinic' })
    const second = await briefFor(submitBrief as never, world, { occasion: 'clinic' })
    expect(second.ref).toBe(first.ref)
    expect(await getBriefByKey(second.ref, second.key)).not.toBeNull()
  })

  it('with Quick Match off, the brief goes to WhatsApp exactly as in feature 001', async () => {
    await setEnabled(false)
    const state = await submitBrief({ status: 'idle' }, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: '', duration: '2h', location: 'dubai', shotBy: 'anyone' }))
    expect(state).toMatchObject({ status: 'ok' })
    expect(state.status === 'ok' && state.whatsappUrl).toMatch(/^https:\/\/wa\.me\//)
    expect(state.status === 'ok' && state.matchUrl).toBeUndefined()
    await setEnabled(true)
  })
})
