import { beforeAll, describe, expect, it } from 'vitest'
import { formatCode, getCreatorByCode, getPublicCreators } from '@/modules/creators'
import { getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, listingOf, makeProvider, publish, type CreatorWorld } from './setup/creators'

describe('CP-US1-S3 only listed creators are public (queries)', () => {
  let world: CreatorWorld
  const ids: Record<string, number> = {}
  const codes: Record<string, string> = {}

  const make = async (name: string, over: Record<string, unknown> = {}, publishIt = true) => {
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider, { displayName: name, ...over })
    if (publishIt) await publish(world, profile.id)
    ids[name] = profile.id
    codes[name] = profile.code as string
    return profile
  }
  const setListing = async (name: string, data: Record<string, unknown>) =>
    world.payload.update({ collection: 'creator-listings', id: (await listingOf(world, ids[name]!))!.id, data, overrideAccess: true, context: quiet })

  beforeAll(async () => {
    world = await creatorWorld()
    await make('Sara Verified', { cities: [world.city] })
    await make('Omar Verified', { personas: [world.personas.videographer] })
    await make('Lina Verified')
    await make('Draft Only', {}, false)
    await make('Paused One')
    await make('Suspended One')
    await setListing('Paused One', { active: false })
    await setListing('Suspended One', { suspended: true })
    // A creator whose only type is outside the audience: reachable, not listed.
    const chef = await world.payload.create({ collection: 'personas', data: { singular: 'Chef', plural: 'Chefs', slug: 'chef' }, context: quiet })
    const provider = await makeProvider(world)
    const profile = await world.payload.create({
      collection: 'creator-profiles',
      data: { displayName: 'Chef Creator', personas: [chef.id], user: provider.id, _status: 'draft' } as never,
      draft: true,
      user: world.admin,
      overrideAccess: false,
      context: quiet,
    })
    await publish(world, profile.id)
    ids['Chef Creator'] = profile.id
    codes['Chef Creator'] = profile.code as string
  })

  const names = async (options?: { listedOnly?: boolean }) => (await getPublicCreators('en', options)).map((c) => c.displayName).sort()

  it('lists published, active, non-suspended creators with a type in the audience — never drafts, paused or suspended', async () => {
    expect(await names()).toEqual(['Lina Verified', 'Omar Verified', 'Sara Verified'])
  })

  it('also returns reachable-but-unlisted creators on request', async () => {
    expect(await names({ listedOnly: false })).toEqual(['Chef Creator', 'Lina Verified', 'Omar Verified', 'Sara Verified'])
  })

  it('CP-FR-012 a city given for a profile is stored as its emirate; the first-publication date is set', async () => {
    const sara = (await getPublicCreators('en')).find((c) => c.displayName === 'Sara Verified')!
    expect(sara.locationIds).toEqual([String(world.abuDhabi)])
    expect(sara.emirateIds).toEqual([String(world.abuDhabi)])
    expect(sara.publishedAt).toBeTruthy()
  })

  it('finds a creator by any spelling of the code; canBook is false for an unlisted creator', async () => {
    const code = codes['Sara Verified']!
    for (const spelling of [code, code.toLowerCase(), `CR-${code}`, ` xy-${code.toLowerCase()} `]) {
      expect((await getCreatorByCode(spelling, 'en'))?.creator.displayName, spelling).toBe('Sara Verified')
    }
    expect((await getCreatorByCode(code, 'en'))?.canBook).toBe(true)
    expect((await getCreatorByCode(codes['Chef Creator']!, 'en'))?.canBook).toBe(false)
  })

  it('never resolves a draft, paused, suspended or unknown code', async () => {
    for (const name of ['Draft Only', 'Paused One', 'Suspended One']) {
      expect(await getCreatorByCode(codes[name]!, 'en'), name).toBeNull()
    }
    expect(await getCreatorByCode('AAAAA', 'en')).toBeNull()
    expect(await getCreatorByCode('not a code', 'en')).toBeNull()
  })

  it('a paused creator returns as soon as the provider resumes; Arabic falls back to English', async () => {
    await setListing('Paused One', { active: true })
    expect(await names()).toContain('Paused One')
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-profiles', id: ids['Sara Verified']!, data: { displayName: 'سارة' }, locale: 'ar', draft: true, user: world.admin, overrideAccess: false, context: quiet })
    await publish(world, ids['Sara Verified']!)
    const ar = (await getPublicCreators('ar')).map((c) => c.displayName)
    expect(ar).toContain('سارة')
    expect(ar).toContain('Omar Verified')
  })

  it('formats the code with the prefix from Site settings', async () => {
    expect(await formatCode('7K4Q2', 'en')).toBe('CR-7K4Q2')
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { creatorCodePrefix: 'shot' }, context: quiet })
    expect(await formatCode('7K4Q2', 'en')).toBe('SHOT-7K4Q2')
  })
})
