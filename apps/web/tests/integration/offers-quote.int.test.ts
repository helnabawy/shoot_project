import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { asClient, bookingByRef, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, form, jar, redirectOf } from './setup/next-mocks'
import { briefByRef, offersWorld } from './setup/offers'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation, acceptQuotation } = await import('@/modules/booking/actions')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { creatorBookingViews } = await import('@/modules/booking/views')
const { creatorAmountFils } = await import('@/modules/booking/rows')

/** Feature 022 US5: the quotation is the chosen offers plus the service fee; the booking starts confirmed. */
describe('OF-US5 quotation, acceptance and payment from the offers', () => {
  let world: BookingWorld
  let photo: string
  let day = 0
  const send = async () => briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)) })
  const actor = async (key: string) => ({ payload: await getTestPayload(), user: world.creators[key]!.user as never, locale: 'en' as const, now: new Date() })
  const budgetOf = async (ref: string) => ((await briefByRef(ref)).budgets as { amountFils: number }[])[0]!.amountFils

  beforeAll(async () => {
    world = await offersWorld()
    photo = String(world.personas.photographer)
    asVisitor()
  })

  it('OF-US5-S1 OF-SC-004 the quotation is one offer line and one fee line; the total is offer plus fee', async () => {
    const b = await send()
    const amount = Math.round(((await budgetOf(b.ref)) * 1.1) / 100) * 100
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept', amountFils: amount })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}`, [`expect.photographer`]: String(amount) })
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    const quotation = await payload.findByID({ collection: 'quotations', id: booking.quotation as number, depth: 0, overrideAccess: true })
    const fee = Math.round((amount * 0.1) / 100) * 100
    expect(quotation.lines!.map((l) => [l.kind, l.amountFils])).toEqual([
      ['offer', amount],
      ['fee', fee],
    ])
    expect(quotation.totalFils).toBe(amount + fee)
    expect(booking.totalFils).toBe(amount + fee)
  })

  it('OF-US5-S2 add-ons and a promo code play no part', async () => {
    const b = await send()
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}`, promo: 'WELCOME20' })
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    const quotation = await payload.findByID({ collection: 'quotations', id: booking.quotation as number, depth: 0, overrideAccess: true })
    expect(quotation.lines!.map((l) => l.kind)).toEqual(['offer', 'fee'])
    expect(quotation.promoCode ?? null).toBeNull()
  })

  it('OF-US4-S7 an offer that moved after the client saw it is refused', async () => {
    const b = await send()
    const budget = await budgetOf(b.ref)
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const to = await redirectOf(() => requestQuotation({ status: 'idle' } as never, form({ locale: 'en', ref: b.ref, key: b.key, pick: `photographer:${world.creators.sara!.code}`, name: 'Layla Hassan', whatsapp: '+971501234567', 'expect.photographer': String(budget + 5000) })))
    // Board 48: back to the offers, naming the creator whose price moved.
    expect(to).toContain(`/match/${b.ref}/${b.key}?pick=`)
    expect(to).toContain(`changed=${world.creators.sara!.code}`)
  })

  it('OF-US5-S3 OF-US5-S4 accepting needs sign-in; then the creator is confirmed and the other offerer lost', async () => {
    const b = await send()
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    await answerBrief(await actor('omar'), b.ref, { persona: photo, decision: 'accept' })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    const guest = await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })))
    expect(guest).toContain('/login')
    await asClient()
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })))
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    expect(booking.state).toBe('confirmed')
    expect(booking.assignments![0]).toMatchObject({ status: 'confirmed' })
    const lost = await payload.find({ collection: 'notifications', where: { and: [{ brief: { equals: (await briefByRef(b.ref)).id } }, { event: { equals: 'offer-lost' } }] }, depth: 0, overrideAccess: true })
    expect(lost.totalDocs).toBeGreaterThan(0)
    jar.clear()
    asVisitor()
  })

  it('OF-FR-012 the creator sees their own offer, never the total with the fee', async () => {
    const b = await send()
    const amount = await budgetOf(b.ref)
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    await asClient()
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })))
    const payload = await getTestPayload()
    const booking = (await payload.find({ collection: 'bookings', where: { reference: { equals: q.ref } }, depth: 1, overrideAccess: true })).docs[0]!
    expect(creatorAmountFils(booking, world.creators.sara!.id)).toBe(amount)
    const rows = creatorBookingViews([booking], [world.creators.sara!.id], 'en', (s) => s)
    expect(rows[0]!.price).toContain(String(amount / 100))
    expect(rows[0]!.price).not.toContain(String(Math.round((amount * 1.1) / 100)))
    jar.clear()
    asVisitor()
  })

  it('OF-US5-S6 online payment charges the quotation total', async () => {
    const b = await send()
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    const booking = await bookingByRef(await getTestPayload(), q.ref)
    const { onlinePaymentAllowed } = await import('@shoot/domain/payments')
    expect(onlinePaymentAllowed({ state: 'confirmed', totalFils: booking.totalFils! })).toBe(true)
    expect(booking.totalFils).toBe((await budgetOf(b.ref)) + Math.round(((await budgetOf(b.ref)) * 0.1) / 100) * 100)
  })

  it('OF-US5-S5 a creator no longer free when the client accepts is refused; nothing is confirmed', async () => {
    const b = await send()
    await answerBrief(await actor('omar'), b.ref, { persona: photo, decision: 'accept' })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.omar!.code}` })
    const payload = await getTestPayload()
    const date = String((await briefByRef(b.ref)).date).slice(0, 10)
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.omar!.id, user: (world.creators.omar!.user as { id: number }).id, date, kind: 'blocked' } as never, overrideAccess: true, context: quiet })
    await asClient()
    const to = await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })))
    expect(to).toContain('booking.errors.creatorUnavailable')
    const booking = await bookingByRef(payload, q.ref)
    expect(booking.state).toBe('quoted')
    expect(booking.assignments![0]).toMatchObject({ status: 'lapsed' })
    jar.clear()
    asVisitor()
  })

  it('OF-EC-03 one creator chosen on two types: one booking, one assignment per type, offers plus one fee', async () => {
    const payload = await getTestPayload()
    const video = String(world.personas.videographer)
    const sara = world.creators.sara!
    const profile = await payload.findByID({ collection: 'creator-profiles', id: sara.id, depth: 0, overrideAccess: true })
    const before = (profile.personas ?? []) as unknown[]
    await payload.update({ collection: 'creator-profiles', id: sara.id, data: { personas: [...before, Number(video)] } as never, overrideAccess: true, context: quiet })
    try {
      const b = await send()
      const brief = await briefByRef(b.ref)
      const budgets = brief.budgets as { persona: unknown; amountFils: number; suggestedFils?: number | null }[]
      await payload.update({ collection: 'briefs', id: brief.id as number, data: { persona: [Number(photo), Number(video)], budgets: [...budgets, { ...budgets[0]!, id: undefined, persona: Number(video) }] } as never, overrideAccess: true, context: quiet })
      await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
      await answerBrief(await actor('sara'), b.ref, { persona: video, decision: 'accept' })
      const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${sara.code},videographer:${sara.code}` })
      const booking = await bookingByRef(payload, q.ref)
      expect(booking.assignments!.map((a) => String(typeof a.persona === 'object' ? (a.persona as { id: unknown }).id : a.persona)).sort()).toEqual([photo, video].sort())
      const quotation = (await payload.find({ collection: 'quotations', where: { reference: { equals: q.ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as { lines: { kind: string }[] }
      expect(quotation.lines.map((l) => l.kind)).toEqual(['offer', 'offer', 'fee'])
    } finally {
      await payload.update({ collection: 'creator-profiles', id: sara.id, data: { personas: before } as never, overrideAccess: true, context: quiet })
    }
  })
})

