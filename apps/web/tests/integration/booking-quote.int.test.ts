import type { Where } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bookingByRef,
  bookingWorld,
  briefFor,
  notificationsOf,
  quoteFor,
  type BookingWorld,
} from './setup/booking'
import { asVisitor, form, jar, signIn } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')

describe('QM-US2 details → quotation', () => {
  let world: BookingWorld
  const brief = (over: Record<string, string | string[]> = {}) =>
    briefFor(submitBrief as never, world, over)
  const quote = (
    b: { ref: string; key: string },
    over: Record<string, string | string[] | undefined> = {},
  ) => quoteFor(requestQuotation as never, b, over)
  const quotationOf = async (ref: string) => {
    const payload = await getTestPayload()
    return (
      await payload.find({
        collection: 'quotations',
        where: { reference: { equals: ref } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0]!
  }

  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => asVisitor())

  it('QM-US2-S1 QM-FR-001 creates a booking (quoted) and quotation v1 linked to the brief, with a private link and notifications', async () => {
    const b = await brief()
    const q = await quote(b, { pick: `photographer:${world.creators.sara!.code}` })
    expect(q.url).toMatch(/^\/q\/Q-[A-Z0-9]{5}\/[A-Za-z0-9_-]{43}$/)
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    const quotation = await quotationOf(q.ref)
    const briefDoc = (
      await payload.find({
        collection: 'briefs',
        where: { reference: { equals: b.ref } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0]!
    expect(booking).toMatchObject({
      state: 'quoted',
      date: world.date,
      location: 'dubai',
      totalFils: 80000,
      client: { name: 'Layla Hassan', whatsapp: '+971501234567', locale: 'en' },
    })
    expect(booking.brief).toBe(briefDoc.id)
    expect(booking.quotation).toBe(quotation.id)
    expect(booking.assignments?.[0]).toMatchObject({
      creator: world.creators.sara!.id,
      status: 'pending',
    })
    expect(quotation).toMatchObject({
      version: 1,
      totalFils: 80000,
      subtotalFils: 80000,
      booking: booking.id,
      brief: briefDoc.id,
    })
    expect(Date.parse(quotation.validUntil) - Date.parse(quotation.issuedAt)).toBe(
      7 * 24 * 3600 * 1000,
    )
    expect(quotation.lines?.[0]).toMatchObject({
      kind: 'tier',
      labelEn: expect.stringContaining('demo price'),
      labelAr: expect.stringContaining('سعر تجريبي'),
      amountFils: 80000,
    })
    const notes = await notificationsOf(payload, booking.id)
    expect(notes.map((n) => `${n.event}:${n.audience}:${n.channel}`).sort()).toEqual([
      'quoted:admin:in-app',
      'quoted:client:whatsapp',
    ])
    expect(notes.find((n) => n.audience === 'client')?.link).toMatch(
      /^https:\/\/wa\.me\/971501234567\?text=/,
    )
  })

  it('QM-US1-S5 "let us choose" continues without a creator', async () => {
    const q = await quote(await brief({ occasion: 'portrait' }))
    const booking = await bookingByRef(await getTestPayload(), q.ref)
    expect(booking.assignments?.[0]).toMatchObject({ creator: null, status: 'open' })
  })

  it('QM-US2-S2 a valid promo code is applied and shown', async () => {
    const q = await quote(await brief({ occasion: 'clinic' }), { promo: 'welcome20' })
    expect(q.query).toBe('promo=applied')
    const quotation = await quotationOf(q.ref)
    expect(quotation).toMatchObject({
      promoCode: 'WELCOME20',
      discountFils: 16000,
      totalFils: 64000,
    })
    expect(quotation.lines?.at(-1)).toMatchObject({
      kind: 'discount',
      amountFils: -16000,
      labelEn: 'Code WELCOME20',
    })
  })

  describe('QM-US2-S4 unusable promo codes', () => {
    it.each([
      ['unknown', 'NOPE123', null],
      ['expired', 'OLDCODE', { endsAt: '2020-01-01T00:00:00Z' }],
      ['used-up', 'USEDUP', { usageLimit: 1, usedCount: 1 }],
    ] as const)(
      'QM-US2-S4 a %s code is not applied and the quotation is still issued',
      async (reason, code, rule) => {
        const payload = await getTestPayload()
        if (rule)
          await payload.create({
            collection: 'promo-codes',
            data: { code, kind: 'percent', value: 10, active: true, ...rule },
            overrideAccess: true,
            context: quiet,
          })
        const q = await quote(await brief({ occasion: 'products' }), { promo: code })
        expect(q.query).toBe(`promo=${reason}`)
        expect(await quotationOf(q.ref)).toMatchObject({
          promoCode: null,
          discountFils: 0,
          totalFils: 80000,
        })
      },
    )
  })

  it('QM-US1-S3 an "any date" brief needs the date in step 3', async () => {
    const b = await brief({ occasion: 'food-drinks', date: '' })
    const missing = await requestQuotation(
      { status: 'idle' },
      form({
        locale: 'en',
        ref: b.ref,
        key: b.key,
        pick: 'photographer:any',
        name: 'Layla',
        whatsapp: '+971501234567',
      }),
    )
    expect(missing).toEqual({ status: 'error', errors: { date: 'booking.errors.date' } })
    const past = await requestQuotation(
      { status: 'idle' },
      form({
        locale: 'en',
        ref: b.ref,
        key: b.key,
        pick: 'photographer:any',
        name: 'Layla',
        whatsapp: '+971501234567',
        date: '2020-01-01',
      }),
    )
    expect(past).toEqual({ status: 'error', errors: { date: 'booking.errors.date' } })
    const q = await quote(b, { date: world.date })
    expect((await bookingByRef(await getTestPayload(), q.ref)).date).toBe(world.date)
  })

  it('field errors come back as message keys', async () => {
    const b = await brief({ occasion: 'travel-lifestyle' })
    const state = await requestQuotation(
      { status: 'idle' },
      form({
        locale: 'en',
        ref: b.ref,
        key: b.key,
        pick: 'photographer:any',
        name: 'L',
        whatsapp: '050',
      }),
    )
    expect(state).toEqual({
      status: 'error',
      errors: { name: 'booking.errors.name', whatsapp: 'contact.errors.whatsappFormat' },
    })
  })

  it('a pick for a creator who does not serve the emirate or is not free is refused', async () => {
    const b = await brief({ occasion: 'car' })
    const state = await requestQuotation(
      { status: 'idle' },
      form({
        locale: 'en',
        ref: b.ref,
        key: b.key,
        pick: `photographer:${world.creators.abu!.code}`,
        name: 'Layla',
        whatsapp: '+971501234567',
      }),
    )
    expect(state).toMatchObject({ status: 'error', formError: 'booking.errors.unavailable' })
  })

  it('a wrong key is refused', async () => {
    const b = await brief({ occasion: 'social-media' })
    const state = await requestQuotation(
      { status: 'idle' },
      form({
        locale: 'en',
        ref: b.ref,
        key: 'x'.repeat(43),
        pick: 'photographer:any',
        name: 'Layla',
        whatsapp: '+971501234567',
      }),
    )
    expect(state).toMatchObject({ formError: 'booking.errors.not-found' })
  })

  it('QM-FR-010 the issued quotation keeps its price after a rule change', async () => {
    const q = await quote(await brief({ occasion: 'property' }))
    const payload = await getTestPayload()
    const photo2h: Where = {
      and: [{ duration: { equals: '2h' } }, { persona: { equals: world.personas.photographer } }],
    }
    await payload.update({
      collection: 'service-tiers',
      where: photo2h,
      data: { price: 999 },
      overrideAccess: true,
      context: quiet,
    })
    expect(await quotationOf(q.ref)).toMatchObject({ totalFils: 80000 })
    await payload.update({
      collection: 'service-tiers',
      where: photo2h,
      data: { price: 800 },
      overrideAccess: true,
      context: quiet,
    })
  })

  it('several types → one booking with one assignment per type and the summed price', async () => {
    const q = await quote(
      await brief({ occasion: 'documentary-editorial', persona: ['photographer', 'videographer'] }),
      { pick: `photographer:any,videographer:${world.creators.vera!.code}` },
    )
    const booking = await bookingByRef(await getTestPayload(), q.ref)
    expect(booking.assignments?.map((a) => [a.creator, a.status])).toEqual([
      [null, 'open'],
      [world.creators.vera!.id, 'pending'],
    ])
    expect(booking.totalFils).toBe(180000)
  })

  it('QM-US2-S6 a member gets the booking in their account', async () => {
    const member = await createUser(['member'])
    const payload = await getTestPayload()
    await signIn(payload as never, member.email)
    const q = await quote(await brief({ occasion: 'aerial-drone' }))
    expect((await bookingByRef(payload, q.ref)).member).toBe(member.id)
    jar.delete('payload-token')
  })

  it('abuse: the sixth quotation in an hour from one visitor is refused; SC-002 quotations are fast', async () => {
    asVisitor('limit-visitor')
    const durations: number[] = []
    for (let i = 0; i < 5; i += 1) {
      const b = await brief({ occasion: 'event', duration: ['1h', '2h', '3h', '4h', '8h'][i]! })
      const started = performance.now()
      await quote(b)
      durations.push(performance.now() - started)
    }
    expect(Math.max(...durations)).toBeLessThan(3000)
    const b = await brief({ occasion: 'friends-party' })
    const state = await requestQuotation(
      { status: 'idle' },
      form({
        locale: 'en',
        ref: b.ref,
        key: b.key,
        pick: 'photographer:any',
        name: 'Layla',
        whatsapp: '+971501234567',
      }),
    )
    expect(state).toMatchObject({ formError: 'booking.errors.tooMany' })
  })
})
