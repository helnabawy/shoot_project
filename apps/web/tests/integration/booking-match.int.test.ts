import { addDays } from '@shoot/domain/booking'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, setMatchValues, type BookingWorld } from './setup/booking'
import { createDraft, makeProvider, publish } from './setup/creators'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { getBriefByKey, getMatchPage } = await import('@/modules/booking/match')

describe('QM-US1 step 2: who is free, at one price', () => {
  let world: BookingWorld
  const page = async (over: Record<string, string | string[]> = {}, date?: string | null) => {
    const brief = await briefFor(submitBrief as never, world, over)
    const record = await getBriefByKey(brief.ref, brief.key)
    return getMatchPage(record!, 'en', new Date(), date === undefined ? {} : { date })
  }
  const codes = (p: Awaited<ReturnType<typeof page>>, i = 0) => p.sections[i]!.creators.map((c) => c.code)

  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => asVisitor())

  it('QM-US1-S1 lists only creators of the type who serve the emirate, with the fixed price, quickly', async () => {
    await page({ occasion: 'clinic' }) // warm the module and query caches, as a running server is
    const brief = await briefFor(submitBrief as never, world)
    const record = await getBriefByKey(brief.ref, brief.key)
    const started = performance.now()
    const p = await getMatchPage(record!, 'en', new Date())
    // The step 2 query itself (the brief was saved before): well inside the 2 s page budget.
    expect(performance.now() - started).toBeLessThan(1000)
    expect(p.sections).toHaveLength(1)
    expect(new Set(codes(p))).toEqual(new Set([world.creators.sara!.code, world.creators.omar!.code]))
    // Demo price: 2 h photographer AED 800, Dubai travel 0.
    expect(p.sections[0]!.price).toMatchObject({ ok: true, total: 80000 })
    expect(p.total).toMatchObject({ ok: true, total: 80000 })
  })

  it('QM-US1-S6 a blocked date or a booked date hides the creator', async () => {
    const payload = await getTestPayload()
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.sara!.id, user: world.creators.sara!.user.id, date: world.date, kind: 'blocked' }, overrideAccess: true, context: quiet })
    const p = await page({ occasion: 'portrait' })
    expect(codes(p)).toEqual([world.creators.omar!.code])
    await payload.delete({ collection: 'availability-blocks', where: { creator: { equals: world.creators.sara!.id } }, overrideAccess: true })
  })

  it('QM-US1-S2 nobody free → nearby dates with someone free', async () => {
    const payload = await getTestPayload()
    for (const key of ['sara', 'omar'] as const) {
      await payload.create({ collection: 'availability-blocks', data: { creator: world.creators[key]!.id, user: world.creators[key]!.user.id, date: world.date, kind: 'blocked' }, overrideAccess: true, context: quiet })
    }
    const p = await page({ occasion: 'family-newborn' })
    expect(codes(p)).toEqual([])
    expect(p.nearby).toEqual([addDays(world.date, 1), addDays(world.date, -1), addDays(world.date, 2)])
    await payload.delete({ collection: 'availability-blocks', where: { date: { equals: world.date } }, overrideAccess: true })
  })

  it('QM-US1-S3 "any date" lists every matching creator', async () => {
    const p = await page({ occasion: 'products', date: '' })
    expect(p.facts.date).toBeNull()
    expect(codes(p)).toHaveLength(2)
  })

  it('a filtering slot keeps only creators with the value; "anyone" keeps all', async () => {
    await setMatchValues(world, 'omar', ['man'])
    const p = await page({ occasion: 'car', shotBy: 'man' })
    expect(codes(p)).toEqual([world.creators.omar!.code])
    await setMatchValues(world, 'omar', [])
  })

  it('QM-US1-S4 no price rule for the duration → price on request', async () => {
    const payload = await getTestPayload()
    await payload.update({ collection: 'service-tiers', where: { duration: { equals: '3h' } }, data: { active: false }, overrideAccess: true, context: quiet })
    const p = await page({ occasion: 'sport-fitness', duration: '3h' })
    expect(p.total).toEqual({ ok: false, reason: 'no-tier' })
    await payload.update({ collection: 'service-tiers', where: { duration: { equals: '3h' } }, data: { active: true }, overrideAccess: true, context: quiet })
  })

  it('two professional types: one section each, one summed price', async () => {
    const p = await page({ occasion: 'music-entertainment', persona: ['photographer', 'videographer'] })
    expect(p.sections.map((s) => s.persona.slug)).toEqual(['photographer', 'videographer'])
    expect(p.sections[1]!.creators.map((c) => c.code)).toEqual([world.creators.vera!.code])
    expect(p.total).toMatchObject({ ok: true, total: 80000 + 100000 })
  })

  it('QM-FR-008 a new persona with a tier and a creator becomes matchable with no code change', async () => {
    const payload = await getTestPayload()
    const chef = await payload.create({ collection: 'personas', data: { singular: 'Chef', plural: 'Chefs', slug: 'chef', active: true }, context: quiet })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [...(settings.activePersonas ?? []).map((p) => (typeof p === 'object' ? p.id : p)), chef.id] }, context: quiet })
    await payload.create({ collection: 'service-tiers', data: { title: 'Private chef, 2 hours', persona: chef.id, duration: '2h', price: 900, active: true }, overrideAccess: true, context: quiet })
    const provider = await makeProvider(world, chef.id)
    const profile = await createDraft(world, provider, { displayName: 'Chef Rami', personas: [chef.id], cities: [world.dubai], specialties: [] })
    await publish(world, profile.id)
    const p = await page({ persona: 'chef', occasion: 'event' })
    expect(p.sections[0]!.creators.map((c) => c.displayName)).toEqual(['Chef Rami'])
    expect(p.total).toMatchObject({ ok: true, total: 90000 })
  })
})
