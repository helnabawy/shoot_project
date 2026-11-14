import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, form, jar, redirectOf } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation, acceptQuotation } = await import('@/modules/booking/actions')
const { getBriefByKey, getMatchPage } = await import('@/modules/booking/match')
const { matchView } = await import('@/modules/booking/commands/match')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')

describe('BI-US2 creators who said yes, at Quick Match step 2 and in the booking', () => {
  let world: BookingWorld
  let day = 0
  const brief = async () => briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)) })
  const accept = async (key: string, ref: string) =>
    answerBrief({ payload: await getTestPayload(), user: world.creators[key]!.user as never, locale: 'en', now: new Date() }, ref, { persona: String(world.personas.photographer), decision: 'accept' })
  const page = async (b: { ref: string; key: string }) => getMatchPage((await getBriefByKey(b.ref, b.key))!, 'en', new Date())

  beforeAll(async () => {
    world = await bookingWorld()
    asVisitor()
  })

  it('BI-US2-S3 BI-US4-S4 acceptors are listed first and marked, on the private link and in the app', async () => {
    const b = await brief()
    const before = (await page(b)).sections[0]!.creators.map((c) => c.id)
    const last = world.creators[before.at(-1) === String(world.creators.sara!.id) ? 'sara' : 'omar']!
    await accept(last === world.creators.sara ? 'sara' : 'omar', b.ref)
    const section = (await page(b)).sections[0]!
    expect(section.creators[0]!.id).toBe(String(last.id))
    expect(section.saidYes).toEqual([String(last.id)])
    const app = await matchView(await getTestPayload(), { ref: b.ref, key: b.key, userId: null, locale: 'en', now: new Date() } as never)
    const cards = app!.sections[0]!.creators
    expect(cards[0]).toMatchObject({ code: expect.any(String), saidYes: true })
    expect(cards.slice(1).every((c) => c.saidYes === undefined)).toBe(true)
  })

  it('BI-US2-S8 an acceptor who is no longer free is not listed', async () => {
    const b = await brief()
    await accept('sara', b.ref)
    const record = await getBriefByKey(b.ref, b.key)
    const date = String(record!.date).slice(0, 10)
    await (await getTestPayload()).create({ collection: 'availability-blocks', data: { creator: world.creators.sara!.id, date, kind: 'blocked', user: world.creators.sara!.user.id }, overrideAccess: true, context: quiet })
    const section = (await page(b)).sections[0]!
    expect(section.creators.map((c) => c.id)).not.toContain(String(world.creators.sara!.id))
    expect(section.saidYes).toEqual([])
  })

  it('BI-US2-S4 the client picks a creator who said yes: once the quotation is accepted they are confirmed', async () => {
    const b = await brief()
    await accept('omar', b.ref)
    const quote = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.omar!.code}` })
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: quote.ref, key: quote.key })))
    const booking = await bookingByRef(await getTestPayload(), quote.ref)
    expect(booking.state).toBe('confirmed')
    expect(booking.assignments![0]).toMatchObject({ status: 'confirmed' })
    const blocks = await (await getTestPayload()).find({ collection: 'availability-blocks', where: { booking: { equals: booking.id } }, depth: 0, overrideAccess: true })
    expect(blocks.totalDocs).toBe(1)
    jar.clear()
    asVisitor()
  })

  it('BI-US2-S5 picking a creator who did not say yes, or "let us choose", is the usual flow', async () => {
    const b = await brief()
    await accept('omar', b.ref)
    const quote = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: quote.ref, key: quote.key })))
    const booking = await bookingByRef(await getTestPayload(), quote.ref)
    expect(booking.state).toBe('accepted')
    expect(booking.assignments![0]).toMatchObject({ status: 'pending' })
    expect(booking.assignments![0]!.respondBy).toBeTruthy()
    const any = await brief()
    await accept('sara', any.ref)
    const q2 = await quoteFor(requestQuotation as never, any, { pick: 'photographer:any' })
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: q2.ref, key: q2.key })))
    expect((await bookingByRef(await getTestPayload(), q2.ref)).assignments![0]).toMatchObject({ status: 'open' })
    jar.clear()
    asVisitor()
  })
})
