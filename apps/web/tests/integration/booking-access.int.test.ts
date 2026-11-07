import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar, signIn } from './setup/next-mocks'
import { createUser, getTestPayload, readable } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { getQuotationAccess } = await import('@/modules/booking/queries')

type U = Awaited<ReturnType<typeof createUser>>

describe('QM-US4-S4 / QM-FR-011 nobody sees another person’s bookings', () => {
  let world: BookingWorld
  let seekerA: U
  let seekerB: U
  let editor: U
  let bookingId: number
  let quote: { ref: string; key: string }
  type C = 'bookings' | 'quotations' | 'payments' | 'booking-events' | 'notifications' | 'availability-blocks'
  const as = async (collection: C, user?: U) => (await getTestPayload()).find({ collection, user, overrideAccess: false, depth: 0 })
  const count = async (collection: C, user?: U) => readable(async () => as(collection, user))

  beforeAll(async () => {
    world = await bookingWorld()
    seekerA = await createUser(['member'])
    seekerB = await createUser(['member'])
    editor = await createUser(['editor'])
    asVisitor()
    await signIn((await getTestPayload()) as never, seekerA.email)
    const b = await briefFor(submitBrief as never, world)
    quote = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    bookingId = (await bookingByRef(await getTestPayload(), quote.ref)).id
    jar.clear()
  })

  it('a client reads only their own bookings and quotations, never admin fields or the salt', async () => {
    const mine = await as('bookings', seekerA)
    expect(mine.docs.map((d) => d.id)).toEqual([bookingId])
    expect(mine.docs[0]).not.toHaveProperty('adminNote')
    expect(mine.docs[0]).not.toHaveProperty('accessSalt')
    expect(await count('quotations', seekerA)).toBe(1)
    expect(await count('bookings', seekerB)).toBe(0)
    expect(await count('quotations', seekerB)).toBe(0)
  })

  it('visitors, other members, providers and editors read no bookings, quotations, payments or events', async () => {
    for (const user of [undefined, seekerB, world.creators.sara!.user, editor]) {
      expect(await count('bookings', user)).toBe(0)
      expect(await count('quotations', user)).toBe(0)
      expect(await count('payments', user)).toBe(0)
      expect(await count('booking-events', user)).toBe(0)
    }
    expect(await count('bookings', world.admin)).toBe(1)
    expect(await count('booking-events', world.admin)).toBeGreaterThan(0)
  })

  it('nobody creates bookings or quotations through the API', async () => {
    const payload = await getTestPayload()
    for (const user of [undefined, seekerA, world.admin]) {
      await expect(payload.create({ collection: 'bookings', data: { reference: 'Q-ZZZZZ', brief: 1 } as never, user, overrideAccess: false })).rejects.toThrow()
      await expect(payload.create({ collection: 'quotations', data: {} as never, user, overrideAccess: false })).rejects.toThrow()
    }
  })

  it('in-app notifications are readable only by their recipient', async () => {
    expect(await count('notifications', seekerB)).toBe(0)
    expect(await count('notifications', world.admin)).toBeGreaterThan(0)
  })

  it('the private link opens the quotation; a wrong key or another member does not', async () => {
    expect(await getQuotationAccess(quote.ref, quote.key)).not.toBeNull()
    expect(await getQuotationAccess(quote.ref, 'x'.repeat(43))).toBeNull()
    expect(await getQuotationAccess(quote.ref, null, seekerB.id)).toBeNull()
    expect(await getQuotationAccess(quote.ref, null, seekerA.id)).not.toBeNull()
    expect(await getQuotationAccess('Q-ZZZZZ', quote.key)).toBeNull()
    expect(await getQuotationAccess('not a ref', quote.key)).toBeNull()
  })
})
