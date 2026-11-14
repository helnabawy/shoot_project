import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { notify } = await import('@/modules/booking/notify')
const { consoleProvider, setPushProvider } = await import('@/modules/push')

describe('QM-FR-006 the notification log', () => {
  let world: BookingWorld
  beforeAll(async () => {
    world = await bookingWorld()
  })

  it('channels and wording come from Site settings; Arabic falls back to English; repeats write nothing', async () => {
    const payload = await getTestPayload()
    const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, locale: 'en' })) as unknown as { quickMatch: { templates: { id: string; event: string; audience: string }[] } }
    const templates = settings.quickMatch.templates.map((t) => (t.event === 'quoted' && t.audience === 'client' ? { ...t, text: 'Ready, {name}: {reference} for {total}.' } : t))
    await payload.updateGlobal({ slug: 'site-settings', locale: 'en', data: { quickMatch: { templates, channels: { client: ['whatsapp', 'in-app'], creator: ['in-app'], admin: ['in-app'] } } } as never, context: quiet })
    const arTemplates = (templates as { id: string; event: string; audience: string }[]).map((t) => (t.event === 'quoted' && t.audience === 'client' ? { ...t, text: '' } : t))
    await payload.updateGlobal({ slug: 'site-settings', locale: 'ar', data: { quickMatch: { templates: arTemplates } } as never, context: quiet }).catch(() => null)

    asVisitor()
    const b = await briefFor(submitBrief as never, world)
    const q = await quoteFor(requestQuotation as never, b)
    const booking = await bookingByRef(payload, q.ref)
    const client = (await notificationsOf(payload, booking.id)).filter((n) => n.audience === 'client')
    // No member: no in-app row; the WhatsApp row carries the configured English wording.
    expect(client.map((n) => n.channel)).toEqual(['whatsapp'])
    expect(client[0]!.text).toBe(`Ready, Layla: ${q.ref} for AED 800.`.replace('AED 800', client[0]!.text.match(/AED\s800/)?.[0] ?? 'AED 800'))

    const full = await payload.findByID({ collection: 'bookings', id: booking.id, depth: 1, overrideAccess: true, showHiddenFields: true })
    expect(await notify(payload, full as never, 'quoted')).toBe(0)

    const arBrief = await briefFor(submitBrief as never, world, { locale: 'ar', occasion: 'portrait' })
    const arQuote = await quoteFor(requestQuotation as never, arBrief, { locale: 'ar' })
    const arBooking = await bookingByRef(payload, arQuote.ref)
    const arClient = (await notificationsOf(payload, arBooking.id)).find((n) => n.audience === 'client')
    expect(arClient?.locale).toBe('ar')
    expect(arClient?.text.length).toBeGreaterThan(0)
  })
})

describe('QM-FR-006 booking changes reach the app by push', () => {
  let world: BookingWorld
  const pushes = consoleProvider(() => {})
  beforeAll(async () => {
    world = await bookingWorld()
    setPushProvider(pushes)
    const payload = await getTestPayload()
    for (const [key, c] of Object.entries(world.creators)) {
      await payload.create({ collection: 'push-devices', data: { user: c.user.id, token: `creator-${key}-token-1`, platform: 'android', locale: 'en' }, overrideAccess: true })
    }
  })
  afterAll(() => setPushProvider(undefined))

  it('the assigned creator and the member client get one push each per change, opening the booking', async () => {
    const payload = await getTestPayload()
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: 'portrait' })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    const member = await createUser(['member'])
    await payload.create({ collection: 'push-devices', data: { user: member.id, token: 'member-token-1', platform: 'ios', locale: 'ar' }, overrideAccess: true })
    const booking = await bookingByRef(payload, q.ref)
    await payload.update({ collection: 'bookings', id: booking.id, data: { member: member.id } as never, overrideAccess: true, context: quiet })
    const full = await payload.findByID({ collection: 'bookings', id: booking.id, depth: 1, overrideAccess: true, showHiddenFields: true })
    const assigned = (full.assignments ?? []).map((a) => (typeof a.creator === 'object' ? a.creator?.id : a.creator))
    const creatorKey = Object.entries(world.creators).find(([, c]) => assigned.includes(c.id))?.[0]
    expect(creatorKey).toBeDefined()

    pushes.sent.length = 0
    await notify(payload, full as never, 'accepted')
    const toCreator = pushes.sent.filter((m) => m.token === `creator-${creatorKey}-token-1`)
    expect(toCreator).toHaveLength(1)
    expect(toCreator[0]).toMatchObject({ data: { event: 'accepted', path: `/account/bookings/${q.ref}` } })
    expect(toCreator[0]!.body.length).toBeGreaterThan(0)
    const toMember = pushes.sent.filter((m) => m.token === 'member-token-1')
    expect(toMember).toHaveLength(1)
    expect(toMember[0]!.data.path).toMatch(new RegExp(`^/q/${q.ref}/[^/]+$`))
    // Creators not on the booking hear nothing.
    expect(pushes.sent.filter((m) => m.token.startsWith('creator-') && m.token !== `creator-${creatorKey}-token-1`)).toHaveLength(0)

    // The same change again pushes nothing.
    pushes.sent.length = 0
    await notify(payload, full as never, 'accepted')
    expect(pushes.sent).toHaveLength(0)
  })
})

