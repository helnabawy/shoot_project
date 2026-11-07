import { beforeAll, describe, expect, it } from 'vitest'
import { creatorWorld, type CreatorWorld } from './setup/creators'
import { createUser, getTestPayload, quiet, readable, rejectsWithKey } from './setup/payload'

type U = Awaited<ReturnType<typeof createUser>>

describe('QM-FR-009 price rules are CMS data with explicit access', () => {
  let world: CreatorWorld
  let editor: U
  let member: U
  beforeAll(async () => {
    world = await creatorWorld()
    editor = await createUser(['editor'])
    member = await createUser(['member'])
  })

  const tier = (over: Record<string, unknown> = {}) => ({ title: '2-hour shoot', persona: world.personas.photographer, duration: '2h', price: 800, ...over })

  it('the default seed invents no prices', async () => {
    const payload = await getTestPayload()
    for (const collection of ['service-tiers', 'travel-fees', 'add-ons', 'promo-codes'] as const) expect((await payload.count({ collection })).totalDocs).toBe(0)
  })

  it('editors create, update and delete; members cannot write', async () => {
    const payload = await getTestPayload()
    const created = await payload.create({ collection: 'service-tiers', data: tier(), user: editor, overrideAccess: false, context: quiet })
    await payload.update({ collection: 'service-tiers', id: created.id, data: { price: 850 }, user: editor, overrideAccess: false, context: quiet })
    await expect(payload.create({ collection: 'service-tiers', data: tier({ duration: '1h' }), user: member, overrideAccess: false })).rejects.toThrow()
    await expect(payload.create({ collection: 'travel-fees', data: { location: 'dubai', fee: 0 }, overrideAccess: false })).rejects.toThrow()
    await payload.delete({ collection: 'service-tiers', id: created.id, user: editor, overrideAccess: false, context: quiet })
  })

  it('everyone reads only active rows; editors read all', async () => {
    const payload = await getTestPayload()
    await payload.create({ collection: 'travel-fees', data: { location: 'sharjah', fee: 50, active: true }, user: editor, overrideAccess: false, context: quiet })
    await payload.create({ collection: 'travel-fees', data: { location: 'ajman', fee: 75, active: false }, user: editor, overrideAccess: false, context: quiet })
    expect((await payload.find({ collection: 'travel-fees', overrideAccess: false })).docs.map((d) => d.location)).toEqual(['sharjah'])
    expect((await payload.find({ collection: 'travel-fees', user: editor, overrideAccess: false })).totalDocs).toBe(2)
  })

  it('values must come from the option sets, and one active tier per type and duration', async () => {
    const payload = await getTestPayload()
    await rejectsWithKey(payload.create({ collection: 'service-tiers', data: tier({ duration: '90m' }), user: editor, overrideAccess: false }), 'pricing.duration.unknown')
    await rejectsWithKey(payload.create({ collection: 'travel-fees', data: { location: 'mars', fee: 1 }, user: editor, overrideAccess: false }), 'pricing.location.unknown')
    await payload.create({ collection: 'service-tiers', data: tier({ duration: '4h' }), user: editor, overrideAccess: false, context: quiet })
    await rejectsWithKey(payload.create({ collection: 'service-tiers', data: tier({ duration: '4h' }), user: editor, overrideAccess: false }), 'pricing.tier.duplicate')
    expect(await payload.create({ collection: 'service-tiers', data: tier({ duration: '4h', active: false }), user: editor, overrideAccess: false, context: quiet })).toMatchObject({ active: false })
  })

  it('promo codes are never public, stored in capitals, and their use count is read-only', async () => {
    const payload = await getTestPayload()
    const code = await payload.create({ collection: 'promo-codes', data: { code: 'summer25', kind: 'percent', value: 25 }, user: editor, overrideAccess: false })
    expect(code).toMatchObject({ code: 'SUMMER25', usedCount: 0 })
    expect(await readable(() => payload.find({ collection: 'promo-codes', overrideAccess: false }))).toBe(0)
    expect(await readable(() => payload.find({ collection: 'promo-codes', user: member, overrideAccess: false }))).toBe(0)
    await payload.update({ collection: 'promo-codes', id: code.id, data: { usedCount: 50 }, user: editor, overrideAccess: false })
    expect((await payload.findByID({ collection: 'promo-codes', id: code.id, overrideAccess: true })).usedCount).toBe(0)
    await rejectsWithKey(payload.create({ collection: 'promo-codes', data: { code: 'X', kind: 'percent', value: 10 }, user: editor, overrideAccess: false }), 'pricing.promo.format')
    await rejectsWithKey(payload.create({ collection: 'promo-codes', data: { code: 'BIGONE', kind: 'percent', value: 120 }, user: editor, overrideAccess: false }), 'pricing.promo.percent')
    await expect(payload.create({ collection: 'promo-codes', data: { code: 'SUMMER25', kind: 'fixed', value: 10 }, user: editor, overrideAccess: false })).rejects.toThrow()
  })
})
