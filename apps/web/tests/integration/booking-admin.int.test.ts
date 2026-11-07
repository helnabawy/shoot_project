import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, eventsOf, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { createUser, getTestPayload, rejectsWithKey } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { applyTransition } = await import('@/modules/booking/transitions')
const { exportBookingsCsv } = await import('@/modules/booking/export')

describe('QM-US4 admin oversight', () => {
  let world: BookingWorld
  let n = 0
  const quoted = async (pick = `photographer:${world.creators.sara!.code}`) => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: ['event', 'portrait', 'clinic', 'car', 'property', 'products', 'food-drinks'][n++ % 7]! })
    const q = await quoteFor(requestQuotation as never, b, { pick })
    return bookingByRef(await getTestPayload(), q.ref)
  }
  const adminUpdate = async (id: number, data: Record<string, unknown>) =>
    (await getTestPayload()).update({ collection: 'bookings', id, data: data as never, user: world.admin, overrideAccess: false })

  beforeAll(async () => {
    world = await bookingWorld()
  })

  it('QM-US4-S1 admins filter by state and see brief, quotation, assignments, payments, events and notifications', async () => {
    const a = await quoted()
    const b = await quoted()
    const payload = await getTestPayload()
    await applyTransition(payload, b.id, 'accept', { actor: 'client', now: new Date() })
    const accepted = await payload.find({ collection: 'bookings', where: { state: { equals: 'accepted' } }, user: world.admin, overrideAccess: false, depth: 1 })
    expect(accepted.docs.map((d) => d.id)).toContain(b.id)
    expect(accepted.docs.map((d) => d.id)).not.toContain(a.id)
    const full = await payload.findByID({ collection: 'bookings', id: b.id, user: world.admin, overrideAccess: false, depth: 1 })
    expect(typeof full.brief).toBe('object')
    expect(typeof full.quotation).toBe('object')
    expect(full.assignments?.[0]?.creator).toMatchObject({ id: world.creators.sara!.id })
    expect(full.events?.docs?.length).toBeGreaterThanOrEqual(2)
    expect(full.notifications?.docs?.length).toBeGreaterThan(0)
  })

  it('QM-US4-S2 reassigning a creator restarts the window, records the change and tells the new creator', async () => {
    const b = await quoted()
    const payload = await getTestPayload()
    await applyTransition(payload, b.id, 'accept', { actor: 'client', now: new Date() })
    const current = await payload.findByID({ collection: 'bookings', id: b.id, depth: 0, overrideAccess: true })
    await adminUpdate(b.id, { assignments: current.assignments!.map((a) => ({ ...a, creator: world.creators.omar!.id })) })
    const after = await payload.findByID({ collection: 'bookings', id: b.id, depth: 0, overrideAccess: true })
    expect(after.assignments?.[0]).toMatchObject({ creator: world.creators.omar!.id, status: 'pending' })
    expect(Date.parse(after.assignments![0]!.respondBy!)).toBeGreaterThan(Date.now() + 23 * 3600 * 1000)
    expect((await eventsOf(payload, b.id)).at(-1)).toMatchObject({ event: 'reassign', actorRole: 'admin', actor: world.admin.id })
    const told = (await notificationsOf(payload, b.id)).filter((x) => x.event === 'reassigned' && x.audience === 'creator')
    expect(told.map((x) => x.user)).toEqual(expect.arrayContaining([world.creators.omar!.user.id]))
  })

  it('QM-US4-S2 adjusting the price issues quotation v2 and points the booking at it', async () => {
    const b = await quoted()
    await adminUpdate(b.id, { priceAdjustment: { amount: -100, reason: 'Loyal client' } })
    const payload = await getTestPayload()
    const after = await payload.findByID({ collection: 'bookings', id: b.id, depth: 1, overrideAccess: true })
    const v2 = after.quotation as { id: number; version: number; totalFils: number; lines: { kind: string; amountFils: number; labelEn: string }[] }
    expect(v2).toMatchObject({ version: 2, totalFils: 70000 })
    expect(v2.lines.at(-1)).toMatchObject({ kind: 'adjustment', amountFils: -10000, labelEn: 'Price adjustment: Loyal client' })
    expect(after.totalFils).toBe(70000)
    const v1 = await payload.findByID({ collection: 'quotations', id: typeof b.quotation === 'object' ? b.quotation!.id : b.quotation!, depth: 0, overrideAccess: true })
    expect(v1.supersededBy).toBe(v2.id)
    expect((await notificationsOf(payload, b.id)).some((x) => x.event === 'adjusted')).toBe(true)
  })

  it('QM-US4-S2 "Change state" follows the booking rules: cancel from paid, complete from hold; never from completed', async () => {
    const b = await quoted()
    const payload = await getTestPayload()
    for (const event of ['accept', 'confirm', 'pay'] as const) await applyTransition(payload, b.id, event, { actor: event === 'accept' ? 'client' : 'admin', now: new Date() })
    await adminUpdate(b.id, { adminAction: 'hold' })
    await adminUpdate(b.id, { adminAction: 'complete' })
    const done = await payload.findByID({ collection: 'bookings', id: b.id, depth: 0, overrideAccess: true })
    expect(done.state).toBe('completed')
    expect(done.payoutDueAt).toBeTruthy()
    await rejectsWithKey(adminUpdate(b.id, { adminAction: 'cancel' }), 'booking.errors.terminal')

    const c = await quoted()
    await applyTransition(payload, c.id, 'accept', { actor: 'client', now: new Date() })
    await adminUpdate(c.id, { adminAction: 'confirm' })
    expect((await payload.find({ collection: 'availability-blocks', where: { booking: { equals: c.id } }, overrideAccess: true })).totalDocs).toBe(1)
    await applyTransition(payload, c.id, 'pay', { actor: 'admin', now: new Date() })
    await adminUpdate(c.id, { adminAction: 'cancel' })
    expect((await payload.findByID({ collection: 'bookings', id: c.id, depth: 0, overrideAccess: true })).state).toBe('cancelled')
    expect((await payload.find({ collection: 'availability-blocks', where: { booking: { equals: c.id } }, overrideAccess: true })).totalDocs).toBe(0)
  })

  it('admins cannot write state, money or timestamps directly', async () => {
    const b = await quoted()
    await adminUpdate(b.id, { state: 'completed', totalFils: 1, acceptedAt: new Date().toISOString(), revision: 99 })
    const after = await (await getTestPayload()).findByID({ collection: 'bookings', id: b.id, depth: 0, overrideAccess: true })
    expect(after).toMatchObject({ state: 'quoted', totalFils: b.totalFils, revision: b.revision })
    expect(after.acceptedAt ?? null).toBeNull()
  })

  it('QM-US4-S3 exports the bookings in a state as CSV, without phone numbers; admins only', async () => {
    const b = await quoted()
    const payload = await getTestPayload()
    await applyTransition(payload, b.id, 'accept', { actor: 'client', now: new Date() })
    const res = await exportBookingsCsv.handler({ payload, user: world.admin, url: 'http://x/api/bookings/export.csv?state=accepted' } as never)
    const text = await res.text()
    const [header, ...rows] = text.replace(/^﻿/, '').split('\n')
    expect(header).toBe('reference,state,date,location,client,personas,creators,totalAed,createdAt,updatedAt')
    expect(rows.every((r) => r.includes('"accepted"'))).toBe(true)
    expect(rows.some((r) => r.includes(b.reference))).toBe(true)
    expect(text).not.toContain('971501234567')
    const member = await createUser(['member'])
    expect((await exportBookingsCsv.handler({ payload, user: member, url: 'http://x/api/bookings/export.csv' } as never)).status).toBe(403)
  })

  it('SC-003 every booking has a brief and a quotation; no confirmed booking misses a creator', async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({ collection: 'bookings', depth: 0, pagination: false, overrideAccess: true })
    expect(docs.length).toBeGreaterThan(0)
    for (const b of docs) {
      expect(b.brief).toBeTruthy()
      expect(b.quotation).toBeTruthy()
      if (['confirmed', 'paid', 'scheduled', 'delivered', 'completed'].includes(b.state)) expect(b.assignments?.every((a) => a.creator)).toBe(true)
    }
  })
})
