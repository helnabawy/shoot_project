import { addDays } from '@shoot/domain/booking'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GET as briefsRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/route'
import { setMapsProvider } from '@/modules/maps/providers'
import { asClient, bookingByRef, quoteFor, type BookingWorld } from './setup/booking'
import { fakeMaps, YAS } from './setup/maps'
import { asVisitor, form, jar, redirectOf } from './setup/next-mocks'
import { briefByRef, offersWorld } from './setup/offers'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { announceBrief, briefsSummary, creatorInbox } = await import('@/modules/inbox')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { requestQuotation, acceptQuotation } = await import('@/modules/booking/actions')
const { creatorBookingViews } = await import('@/modules/booking/views')

/** What must never reach a creator before they are booked (FR-005b, SC-008): the pin and the address. */
const EXACT = [String(YAS.lat), String(YAS.lng), 'Yas Marina Circuit']
const leaks = (value: unknown) => EXACT.filter((needle) => JSON.stringify(value ?? null).includes(needle))

describe('OF-SC-008 no exact place in any creator read before booking', () => {
  let world: BookingWorld
  let ref = ''
  let key = ''

  beforeAll(async () => {
    world = await offersWorld()
    setMapsProvider(fakeMaps)
    asVisitor()
    const sent = (await submitBrief(
      { status: 'idle' } as never,
      form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: addDays(world.date, 2), duration: '2h', location: 'abu-dhabi', shotBy: 'anyone', 'place.lat': String(YAS.lat), 'place.lng': String(YAS.lng), 'place.source': 'search', 'place.placeId': 'yas-marina' }),
    )) as { matchUrl?: string }
    const parts = sent.matchUrl!.replace(/^\/ar/, '').split('/')
    ref = parts[2]!
    key = parts[3]!
    await announceBrief(await getTestPayload(), (await briefByRef(ref)).id as number)
  })
  afterAll(() => setMapsProvider(undefined))

  it('the inbox, Up next, the app API, the notifications and a direct read show the area only', async () => {
    const payload = await getTestPayload()
    const abu = world.creators.abu!.user as { id: number; email: string }
    const ctx = { payload, locale: 'en' as const, now: new Date() }
    const inbox = await creatorInbox(ctx, abu.id)
    const item = inbox?.open.find((i) => i.ref === ref)
    expect(item?.place?.area).toBe('Yas Island')
    // The map and "Open in Maps" get the public point (the cell centre), never the pin.
    expect(item?.place?.point).toEqual({ lat: expect.any(Number), lng: expect.any(Number) })
    expect(item?.place?.point).not.toEqual({ lat: YAS.lat, lng: YAS.lng })
    // How long, under When.
    expect(item?.duration).toBeTruthy()
    expect(leaks(inbox)).toEqual([])
    expect(leaks(await briefsSummary(ctx, abu.id))).toEqual([])

    const token = (await payload.login({ collection: 'users', data: { email: abu.email, password: 'password-123' } })).token as string
    const api = await briefsRoute(new Request('http://test/api/mobile/v1/me/creator/briefs', { headers: { authorization: `Bearer ${token}`, 'accept-language': 'en' } }), { params: Promise.resolve({}) })
    expect(api.status).toBe(200)
    expect(leaks(await api.json())).toEqual([])

    const brief = await briefByRef(ref)
    const notes = await payload.find({ collection: 'notifications', where: { brief: { equals: brief.id } }, depth: 0, overrideAccess: true })
    expect(notes.totalDocs).toBeGreaterThan(0)
    expect(leaks(notes.docs)).toEqual([])

    const direct = await payload.findByID({ collection: 'briefs', id: brief.id as number, depth: 0, overrideAccess: false, user: world.creators.abu!.user as never }).catch(() => null)
    expect(leaks(direct)).toEqual([])
  })

  it('OF-US2-S1b the booked creator sees the address and directions once confirmed, not before', async () => {
    const payload = await getTestPayload()
    const abu = world.creators.abu!
    await answerBrief({ payload, user: abu.user as never, locale: 'en', now: new Date() }, ref, { persona: String(world.personas.photographer), decision: 'accept' })
    const q = await quoteFor(requestQuotation as never, { ref, key }, { pick: `photographer:${abu.code}` })
    const quoted = await bookingByRef(payload, q.ref)
    expect(creatorBookingViews([{ ...quoted, brief: await briefByRef(ref) } as never], [abu.id], 'en', (x) => x)[0]?.exactPlace ?? null).toBeNull()
    await asClient()
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })))
    jar.clear()
    asVisitor()
    const booked = await bookingByRef(payload, q.ref)
    expect(booked.state).toBe('confirmed')
    const view = creatorBookingViews([{ ...booked, brief: await briefByRef(ref) } as never], [abu.id], 'en', (x) => x)[0]!
    expect(view.exactPlace).toEqual({ address: 'Yas Marina Circuit, Yas Island, Abu Dhabi', directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${YAS.lat},${YAS.lng}` })
  })
})

