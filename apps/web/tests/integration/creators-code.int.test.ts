import { formatCreatorCode } from '@shoot/domain/creators'
import { beforeAll, describe, expect, it } from 'vitest'
import { getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, makeProvider, publish, type CreatorWorld } from './setup/creators'

describe('CP-FR-007 creator code', () => {
  let world: CreatorWorld
  beforeAll(async () => {
    world = await creatorWorld()
  })

  it('is 5 characters without a prefix, generated on create, and unique across 200 creates', async () => {
    const codes = new Set<string>()
    for (let i = 0; i < 200; i += 1) {
      const provider = await makeProvider(world)
      const profile = await createDraft(world, provider)
      expect(profile.code).toMatch(/^[2-9A-HJKMNP-Z]{5}$/)
      codes.add(profile.code as string)
    }
    expect(codes.size).toBe(200)
  }, 180_000)

  it('a client-supplied code is ignored on create', async () => {
    const provider = await makeProvider(world)
    const profile = await world.payload.create({
      collection: 'creator-profiles',
      data: { displayName: 'X Y', personas: [world.personas.photographer], code: 'AAAAA', _status: 'draft' } as never,
      draft: true,
      user: provider,
      overrideAccess: false,
      context: quiet,
    })
    expect(profile.code).not.toBe('AAAAA')
  })

  it('changing the prefix changes nothing stored; the shown code follows the setting', async () => {
    const payload = await getTestPayload()
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    await publish(world, profile.id)
    await payload.updateGlobal({ slug: 'site-settings', data: { creatorCodePrefix: 'xy' }, context: quiet })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    expect(settings.creatorCodePrefix).toBe('XY')
    const stored = await payload.findByID({ collection: 'creator-profiles', id: profile.id, draft: true, depth: 0 })
    expect(stored.code).toBe(profile.code)
    expect(formatCreatorCode(settings.creatorCodePrefix as string, stored.code as string)).toBe(`XY-${profile.code}`)
  })

  it('rejects a prefix that is not 2–4 letters', async () => {
    const payload = await getTestPayload()
    await expect(payload.updateGlobal({ slug: 'site-settings', data: { creatorCodePrefix: 'X' }, context: quiet })).rejects.toThrow()
    await expect(payload.updateGlobal({ slug: 'site-settings', data: { creatorCodePrefix: 'ABCDE' }, context: quiet })).rejects.toThrow()
  })
})
