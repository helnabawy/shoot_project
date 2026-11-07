import { beforeAll, describe, expect, it } from 'vitest'
import { getTestPayload } from './setup/payload'
import { createDraft, creatorWorld, makeProvider, publicProfiles, publish, type CreatorWorld } from './setup/creators'

// research §2 "Verify first": the design rests on this behaviour of Payload drafts. If a case fails,
// amend research.md and data-model.md before building on it (Principle I).
describe('CP-FR-002 Payload drafts spike', () => {
  let world: CreatorWorld
  let provider: Awaited<ReturnType<typeof makeProvider>>
  let profileId: number

  beforeAll(async () => {
    world = await creatorWorld()
    provider = await makeProvider(world)
    profileId = (await createDraft(world, provider)).id
  })

  it('(b) a never-published profile is invisible to anonymous reads', async () => {
    expect((await publicProfiles(world)).docs).toHaveLength(0)
  })

  it('(c) the owner reads their latest draft, other providers cannot', async () => {
    const payload = await getTestPayload()
    const mine = await payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: provider, overrideAccess: false })
    expect(mine.displayName).toBe('Sara Khan')
    const other = await makeProvider(world)
    await expect(payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: other, overrideAccess: false })).rejects.toThrow()
  })

  it('publishing makes the profile public', async () => {
    await publish(world, profileId)
    expect((await publicProfiles(world)).docs.map((d) => d.displayName)).toEqual(['Sara Khan'])
  })

  it('(a) a newer draft stays out of anonymous reads while the owner sees it', async () => {
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-profiles', id: profileId, data: { displayName: 'Sara Q' }, draft: true, user: provider, overrideAccess: false })
    expect((await publicProfiles(world)).docs.map((d) => d.displayName)).toEqual(['Sara Khan'])
    const mine = await payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: provider, overrideAccess: false })
    expect(mine.displayName).toBe('Sara Q')
  })

  it('(d) localized text round-trips draft → publish → read in en and ar', async () => {
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-profiles', id: profileId, data: { displayName: 'سارة' }, locale: 'ar', draft: true, user: provider, overrideAccess: false })
    await publish(world, profileId)
    expect((await publicProfiles(world, 'ar')).docs[0]?.displayName).toBe('سارة')
    expect((await publicProfiles(world, 'en')).docs[0]?.displayName).toBe('Sara Q')
  })

  it('(e) regression guard for research §18: a non-draft update publishes the pending draft too', async () => {
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-profiles', id: profileId, data: { bio: 'Pending bio' }, draft: true, user: provider, overrideAccess: false })
    expect((await publicProfiles(world)).docs[0]?.bio).toBe('Weddings and portraits.')
    // An admin changes something unrelated and publishes: the provider's pending text goes live with it.
    await publish(world, profileId, { cities: [world.dubai, world.city] })
    expect((await publicProfiles(world)).docs[0]?.bio).toBe('Pending bio')
  })
})
