import { addDays } from '@shoot/domain/booking'
import { briefBuilderV1, briefReceiptV1, problemV1 } from '@shoot/domain/api/v1'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Brief } from '@/payload-types'
import { bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, form } from './setup/next-mocks'
import { call } from './setup/otp'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { GET: briefBuilder } = await import('@/app/(payload)/api/mobile/v1/brief-builder/route')
const { POST: recordBrief } = await import('@/app/(payload)/api/mobile/v1/briefs/route')
const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { matchView } = await import('@/modules/booking/commands/match')

/** Feature 026 end to end: the switch, the website brief, the app brief, step 2 and the booking. */
describe('026 the start time of a brief', () => {
  let world: BookingWorld
  let day = 20
  const nextDay = () => addDays(world.date, (day += 1))
  const setTime = async (enabled: boolean, required = false) =>
    (await getTestPayload()).updateGlobal({ slug: 'site-settings', data: { briefTime: { enabled, required } } as never, context: quiet })
  const builder = async () => briefBuilderV1.parse(await (await call(briefBuilder, 'brief-builder', { method: 'GET' })).json())
  const briefByRef = async (ref: string) =>
    (await (await getTestPayload()).find({ collection: 'briefs', where: { reference: { equals: ref } }, overrideAccess: true, depth: 0 })).docs[0] as Brief
  const install = () => ({ 'x-shoot-install': crypto.randomUUID() })
  const appBody = (over: { date?: string | null; time?: string } = {}) => ({
    selections: [
      { token: 'persona', value: 'photographer' },
      { token: 'occasion', value: 'event' },
      ...(over.time ? [{ token: 'time', value: over.time }] : []),
      { token: 'duration', value: '2h' },
      { token: 'location', value: 'dubai' },
      { token: 'shotBy', value: 'anyone' },
    ],
    date: over.date === undefined ? nextDay() : over.date,
  })

  beforeAll(async () => {
    world = await bookingWorld()
    asVisitor()
  })
  afterAll(() => setTime(false))

  it('BT-US3-S1 BT-US3-S2 off by default the builder is as before; on, a time step follows the date', async () => {
    await setTime(false)
    const off = (await builder()).builder!
    expect(off.slots.map((s) => s.token)).toEqual(['persona', 'occasion', 'date', 'duration', 'location', 'shotBy'])
    expect(off.sentence).toBe('I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.')
    await setTime(true)
    const on = (await builder()).builder!
    expect(on.slots.map((s) => s.token)).toEqual(['persona', 'occasion', 'date', 'time', 'duration', 'location', 'shotBy'])
    const time = on.slots[3]!
    expect(time).toMatchObject({ kind: 'time', groupLabel: 'Start time', placeholder: 'any time', required: false })
    expect(time.options[0]).toMatchObject({ value: '07-00', label: '07:00' })
    expect(time.options).toHaveLength(15)
    expect(on.sentence).toContain('on {date} at {time} for {duration}')
    expect(on.whatsappTemplate).toContain('on {date} at {time} for {duration}')
  })

  it('BT-US2-S1 a website brief keeps the time in the record, its selection, the sentence and the WhatsApp message', async () => {
    await setTime(true)
    const date = nextDay()
    const state = (await submitBrief({ status: 'idle' }, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date, time: '16-00', duration: '2h', location: 'dubai', shotBy: 'anyone' }))) as { status: string; reference?: string; whatsappUrl?: string; sentence?: string }
    expect(state.status).toBe('ok')
    expect(state.sentence).toMatch(/ on \w{3} \d{1,2} \w{3} at 16:00 for 2 hours /)
    expect(decodeURIComponent(state.whatsappUrl!)).toContain(' at 16:00 for 2 hours')
    const brief = await briefByRef(state.reference!)
    expect(brief.startTime).toBe('16:00')
    expect(brief.selections?.find((s) => s.token === 'time')).toMatchObject({ value: '16-00', label: '16:00' })
  })

  it('BT-US2-S1 an app brief keeps the time; a time without a date is dropped; a time not offered is refused', async () => {
    await setTime(true)
    const withTime = briefReceiptV1.parse(await (await call(recordBrief, 'briefs', { body: appBody({ time: '09-00' }), headers: install() })).json())
    expect(withTime.sentence).toContain(' at 09:00 for ')
    expect((await briefByRef(withTime.reference)).startTime).toBe('09:00')

    const anyDate = briefReceiptV1.parse(await (await call(recordBrief, 'briefs', { body: appBody({ date: null, time: '09-00' }), headers: install() })).json())
    expect(anyDate.sentence).not.toContain('09:00')
    expect((await briefByRef(anyDate.reference)).startTime ?? null).toBeNull()

    const gone = await call(recordBrief, 'briefs', { body: appBody({ time: '09-30' }), headers: install() })
    expect(gone.status).toBe(422)
    expect(problemV1.parse(await gone.json()).fields?.[0]).toMatchObject({ path: 'body.selections.time', code: 'brief.errors.optionGone' })
  })

  it('BT-US3-S1 with the switch off a time sent by an app is refused as an unknown step, nothing else changes', async () => {
    await setTime(false)
    const ok = briefReceiptV1.parse(await (await call(recordBrief, 'briefs', { body: appBody(), headers: install() })).json())
    expect((await briefByRef(ok.reference)).startTime ?? null).toBeNull()
    const stale = await call(recordBrief, 'briefs', { body: appBody({ time: '09-00' }), headers: install() })
    expect(stale.status).toBe(422)
  })

  it('BT-US2-S2 step 2 carries the time and the booking made on the website keeps it', async () => {
    await setTime(true)
    const b = await briefFor(submitBrief as never, world, { date: nextDay(), time: '18-00' })
    const app = await matchView(await getTestPayload(), { ref: b.ref, key: b.key, userId: null, locale: 'en', now: new Date() } as never)
    expect(app!.brief.startTime).toBe('18:00')
    const quote = await quoteFor(requestQuotation as never, b)
    expect((await bookingByRef(await getTestPayload(), quote.ref)).details?.startTime).toBe('18:00')
  })
})
