import { addDays, dubaiToday } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingWorld, type BookingWorld } from './setup/booking'
import { form, jar, redirectOf, signIn } from './setup/next-mocks'
import { getTestPayload, rejectsWithKey } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { toggleBlockedDate } = await import('@/modules/booking/actions')

describe('QM-FR-002 creators block their own dates', () => {
  let world: BookingWorld
  const day = addDays(dubaiToday(new Date()), 3)
  const toggle = (action: 'block' | 'free', date = day) => redirectOf(() => toggleBlockedDate(form({ locale: 'en', date, action })))
  const blocks = async (creator: number) => (await getTestPayload()).find({ collection: 'availability-blocks', where: { creator: { equals: creator } }, depth: 0, overrideAccess: true })

  beforeAll(async () => {
    world = await bookingWorld()
    jar.clear()
    await signIn((await getTestPayload()) as never, world.creators.sara!.user.email!)
  })

  it('blocks and frees a future date of their own profile', async () => {
    expect(await toggle('block')).toBe('/account/availability')
    expect((await blocks(world.creators.sara!.id)).docs).toMatchObject([{ date: day, kind: 'blocked', user: world.creators.sara!.user.id }])
    expect(await toggle('free')).toBe('/account/availability')
    expect((await blocks(world.creators.sara!.id)).totalDocs).toBe(0)
  })

  it('refuses past dates', async () => {
    expect(await toggle('block', addDays(dubaiToday(new Date()), -1))).toBe('/account/availability?error=availability.errors.past')
  })

  it('cannot block for someone else, nor free a booked date', async () => {
    const payload = await getTestPayload()
    await rejectsWithKey(payload.create({ collection: 'availability-blocks', data: { creator: world.creators.omar!.id, date: day, kind: 'blocked', user: world.creators.sara!.user.id }, user: world.creators.sara!.user, overrideAccess: false }), 'availability.errors.notYours')
    await rejectsWithKey(payload.create({ collection: 'availability-blocks', data: { creator: world.creators.sara!.id, date: day, kind: 'booking', user: world.creators.sara!.user.id }, user: world.creators.sara!.user, overrideAccess: false }), 'availability.errors.kind')
    const booked = await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.sara!.id, date: addDays(day, 1), kind: 'booking', user: world.creators.sara!.user.id }, overrideAccess: true })
    await toggle('free', addDays(day, 1))
    expect((await payload.findByID({ collection: 'availability-blocks', id: booked.id, overrideAccess: true })).kind).toBe('booking')
    expect((await payload.find({ collection: 'availability-blocks', user: world.creators.omar!.user, overrideAccess: false })).docs.filter((d) => d.creator === world.creators.sara!.id)).toHaveLength(0)
  })
})
