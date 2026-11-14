import { addDays } from '@shoot/domain/booking'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { listingOf } from './setup/creators'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { consoleProvider, setPushProvider } = await import('@/modules/push')

describe('BI-US5 creators hear about a new brief that matches them', () => {
  let world: BookingWorld
  let day = 0
  const pushes = consoleProvider(() => {})
  const payload = () => getTestPayload()
  const tokens: Record<string, string> = {}
  const send = async (over: Record<string, string> = {}) => {
    pushes.sent.length = 0
    asVisitor()
    return (await briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)), ...over })).ref
  }
  const pushed = () => pushes.sent.map((m) => Object.keys(tokens).find((k) => tokens[k] === m.token)).sort()

  beforeAll(async () => {
    world = await bookingWorld()
    setPushProvider(pushes)
    for (const [key, locale] of [['sara', 'en'], ['omar', 'ar'], ['vera', 'en'], ['abu', 'en']] as const) {
      tokens[key] = `token-${key}-0001`
      await (await payload()).create({ collection: 'push-devices', data: { user: world.creators[key]!.user.id, token: tokens[key]!, platform: 'android', locale }, overrideAccess: true })
    }
  })
  afterAll(() => setPushProvider(undefined))

  it('BI-US5-S1 BI-SC-005 each matching creator gets one push, in their language, opening the inbox', async () => {
    const ref = await send()
    expect(pushed()).toEqual(['omar', 'sara'])
    const omar = pushes.sent.find((m) => m.token === tokens.omar)!
    expect(omar).toMatchObject({ title: 'طلب جديد لك', data: { event: 'brief-new', path: '/account/inbox' } })
    expect(pushes.sent.find((m) => m.token === tokens.sara)!.body).toContain('Photographer')
    const id = (await (await payload()).find({ collection: 'briefs', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!.id
    const rows = (await (await payload()).find({ collection: 'notifications', where: { brief: { equals: id } }, depth: 0, pagination: false, overrideAccess: true })).docs
    expect(rows.filter((r) => r.channel === 'in-app')).toHaveLength(2)
    expect(JSON.stringify(rows)).not.toMatch(/\+971|Layla/)
  })

  it('BI-US5-S2 a brief sent to one named creator pushes only that creator', async () => {
    await send({ creator: world.creators.omar!.code })
    expect(pushed()).toEqual(['omar'])
  })

  it('BI-US5-S3 creators who do not match, are hidden or switched push off get nothing', async () => {
    await send({ persona: 'videographer' })
    expect(pushed()).toEqual(['vera'])
    await (await payload()).update({ collection: 'users', id: world.creators.sara!.user.id, data: { pushEnabled: false }, overrideAccess: true, context: quiet })
    const listing = await listingOf(world, world.creators.omar!.id)
    await (await payload()).update({ collection: 'creator-listings', id: listing!.id, data: { suspended: true }, overrideAccess: true, context: quiet })
    await send()
    expect(pushed()).toEqual([])
    await (await payload()).update({ collection: 'users', id: world.creators.sara!.user.id, data: { pushEnabled: true }, overrideAccess: true, context: quiet })
  })

  it('BI-US5-S4 a device the service forgot is removed, and the brief is still saved', async () => {
    setPushProvider({ name: 'gone', send: async () => 'gone' })
    const ref = await send({ location: 'abu-dhabi' })
    setPushProvider(pushes)
    expect(ref).toMatch(/^B-/)
    const devices = await (await payload()).find({ collection: 'push-devices', where: { user: { equals: world.creators.abu!.user.id } }, depth: 0, overrideAccess: true })
    expect(devices.totalDocs).toBe(0)
  })
})
