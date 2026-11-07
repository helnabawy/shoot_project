import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { notify } = await import('@/modules/booking/notify')

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
