import { placeAutocompleteV1, placeV1, problemV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { POST as autocompleteRoute } from '@/app/(payload)/api/mobile/v1/places/autocomplete/route'
import { GET as detailsRoute } from '@/app/(payload)/api/mobile/v1/places/[placeId]/route'
import { POST as reverseRoute } from '@/app/(payload)/api/mobile/v1/places/reverse/route'
import { POST as briefsRoute } from '@/app/(payload)/api/mobile/v1/briefs/route'
import { setMapsProvider } from '@/modules/maps/providers'
import type { RouteHandler } from '@/shared/api/handler'
import type { BookingWorld } from './setup/booking'
import { DOHA, DOWNTOWN, fakeMaps, SEA, YAS } from './setup/maps'
import { asVisitor, form, jar, signIn } from './setup/next-mocks'
import { briefByRef, offersWorld } from './setup/offers'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { saveMyBase } = await import('@/modules/maps/base-action')
const { creatorInbox, announceBrief } = await import('@/modules/inbox')

function call(handler: RouteHandler, path: string, opts: { method?: string; body?: unknown; params?: Record<string, string>; install?: string } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', 'accept-language': 'en', 'x-shoot-install': opts.install ?? 'a'.repeat(32) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  )
}

/** Feature 022 US1 with maps on: the client marks the place; the server reads its area and emirate (R15). */
describe('OF-US1 the place pin', () => {
  let world: BookingWorld
  let day = 0
  const send = (over: Record<string, string>) =>
    submitBrief({ status: 'idle' } as never, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: addDays(world.date, (day += 1)), duration: '2h', location: 'dubai', shotBy: 'anyone', ...over }))

  beforeAll(async () => {
    world = await offersWorld()
    setMapsProvider(fakeMaps)
    asVisitor()
  })
  afterAll(() => setMapsProvider(undefined))

  it('OF-US1-S4 with maps on, a brief needs a pin inside the emirates served', async () => {
    const none = (await send({})) as { status: string; errors?: Record<string, string> }
    expect(none.status).toBe('error')
    expect(Object.values(none.errors ?? {})).toContain('brief.errors.placeOutside')
    const abroad = (await send({ 'place.lat': String(DOHA.lat), 'place.lng': String(DOHA.lng), 'place.source': 'drag' })) as { errors?: Record<string, string> }
    expect(Object.values(abroad.errors ?? {})).toContain('brief.errors.placeOutside')
    const sea = (await send({ 'place.lat': String(SEA.lat), 'place.lng': String(SEA.lng), 'place.source': 'drag' })) as { errors?: Record<string, string> }
    expect(Object.values(sea.errors ?? {})).toContain('brief.errors.placeOutside')
  })

  it('OF-US1-S4 a pinned brief keeps the pin, its area and emirate, and a public point near it', async () => {
    const sent = (await send({ 'place.lat': String(YAS.lat), 'place.lng': String(YAS.lng), 'place.source': 'search', 'place.placeId': 'yas-marina' })) as { matchUrl?: string }
    expect(sent.matchUrl).toBeTruthy()
    const ref = sent.matchUrl!.replace(/^\/ar/, '').split('/')[2]!
    const place = (await briefByRef(ref)).place as Record<string, unknown>
    expect(place).toMatchObject({ lat: YAS.lat, lng: YAS.lng, area: 'Yas Island', source: 'search', placeId: 'yas-marina' })
    expect(Math.abs((place.publicLat as number) - YAS.lat)).toBeLessThan(0.02)
    expect(place.publicLat).not.toBe(YAS.lat)
  })

  it('OF-US1-S4a search answers places in the UAE; picking one gives its area and emirate', async () => {
    const found = placeAutocompleteV1.parse(await (await call(autocompleteRoute, 'places/autocomplete', { method: 'POST', body: { q: 'yas marina', sessionToken: 'session-1234' } })).json())
    expect(found.results[0]).toMatchObject({ placeId: 'yas-marina', main: 'Yas Marina Circuit' })
    const picked = placeV1.parse(await (await call(detailsRoute, 'places/yas-marina?sessionToken=session-1234', { params: { placeId: 'yas-marina' } })).json())
    expect(picked).toMatchObject({ inside: true, area: 'Yas Island', emirate: { slug: 'abu-dhabi' } })
    const unknown = await call(detailsRoute, 'places/nowhere?sessionToken=session-1234', { params: { placeId: 'nowhere' } })
    expect(unknown.status).toBe(404)
    expect(problemV1.parse(await unknown.json()).code).toBe('api.errors.notFound')
  })

  it('OF-US1-S4a under /ar the provider is asked for Arabic names', async () => {
    const asked: string[] = []
    setMapsProvider({ ...fakeMaps, reverse: async (lat, lng, language) => (asked.push(language), fakeMaps.reverse(lat, lng, language)) })
    try {
      const res = await reverseRoute(new Request('http://test/api/mobile/v1/places/reverse', { method: 'POST', headers: { 'content-type': 'application/json', 'accept-language': 'ar', 'x-shoot-install': 'b'.repeat(32) }, body: JSON.stringify(YAS) }), { params: Promise.resolve({}) })
      expect(res.status).toBe(200)
      expect(asked).toContain('ar')
    } finally {
      setMapsProvider(fakeMaps)
    }
  })

  it('OF-US1-S4b dragging the pin updates the area and emirate; outside is not inside', async () => {
    const dubai = placeV1.parse(await (await call(reverseRoute, 'places/reverse', { method: 'POST', body: DOWNTOWN })).json())
    expect(dubai).toMatchObject({ inside: true, area: 'Downtown Dubai', emirate: { slug: 'dubai' } })
    const out = placeV1.parse(await (await call(reverseRoute, 'places/reverse', { method: 'POST', body: DOHA })).json())
    expect(out).toMatchObject({ inside: false, area: null, emirate: null })
  })

  it('OF-US2-S1a a creator sets where they start from; the inbox then says how far the brief is', async () => {
    const payload = await getTestPayload()
    const abu = world.creators.abu!.user as { id: number; email: string }
    await signIn(payload as never, abu.email)
    expect(await saveMyBase({ status: 'idle' }, form({ locale: 'en', 'place.lat': '25.5', 'place.lng': '51.4' }))).toEqual({ status: 'error', error: 'brief.errors.placeOutside' })
    expect(await saveMyBase({ status: 'idle' }, form({ locale: 'en', 'place.lat': '24.45', 'place.lng': '54.38', 'place.source': 'search' }))).toEqual({ status: 'saved' })
    jar.clear()
    asVisitor()
    const sent = (await send({ location: 'abu-dhabi', 'place.lat': String(YAS.lat), 'place.lng': String(YAS.lng), 'place.source': 'search' })) as { matchUrl?: string }
    const ref = sent.matchUrl!.replace(/^\/ar/, '').split('/')[2]!
    await announceBrief(payload, (await briefByRef(ref)).id as number)
    const item = (await creatorInbox({ payload, locale: 'en', now: new Date() }, abu.id))!.open.find((i) => i.ref === ref)!
    expect(item.place?.distanceKm).toBeGreaterThan(10)
    expect(item.place?.distanceKm).toBeLessThan(40)
  })

  it('OF-SC-006 an app without the place step still sends a brief; the emirate chosen is used', async () => {
    const date = addDays(world.date, 20)
    const res = await call(briefsRoute, 'briefs', { method: 'POST', body: { selections: [{ token: 'persona', value: 'photographer' }, { token: 'occasion', value: 'event' }, { token: 'duration', value: '2h' }, { token: 'location', value: 'dubai' }, { token: 'shotBy', value: 'anyone' }], date } })
    expect(res.status, await res.clone().text()).toBe(200)
    const { reference } = (await res.json()) as { reference: string }
    expect((await briefByRef(reference)).place).toMatchObject({ source: 'fallback', lat: null })
  })
})

