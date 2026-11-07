import { beforeAll, describe, expect, it } from 'vitest'
import { createUser, getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, listingOf, makeProvider, publicProfiles, publish, type CreatorWorld } from './setup/creators'

describe('CP-FR-001 / CP-FR-002 access matrix (Principle VII)', () => {
  let world: CreatorWorld
  let owner: Awaited<ReturnType<typeof makeProvider>>
  let other: Awaited<ReturnType<typeof makeProvider>>
  let profileId: number

  beforeAll(async () => {
    world = await creatorWorld()
    owner = await makeProvider(world)
    other = await makeProvider(world, world.personas.videographer)
    profileId = (await createDraft(world, owner)).id
    await publish(world, profileId)
  })

  it('CP-FR-001 a seeker cannot create a profile; a provider creates exactly one', async () => {
    const seeker = await createUser(['member'])
    await expect(createDraft(world, seeker)).rejects.toThrow()
    await expect(createDraft(world, owner)).rejects.toThrow()
    expect(await createDraft(world, other)).toMatchObject({ _status: 'draft' })
  })

  it('CP-FR-002 CP-US1-S3 anonymous reads only published, active, non-suspended profiles', async () => {
    expect((await publicProfiles(world)).docs.map((d) => d.id)).toEqual([profileId])
    const listing = await listingOf(world, profileId)
    await world.payload.update({ collection: 'creator-listings', id: listing!.id, data: { suspended: true }, user: world.admin, overrideAccess: false, context: quiet })
    expect((await publicProfiles(world)).docs).toHaveLength(0)
    await world.payload.update({ collection: 'creator-listings', id: listing!.id, data: { suspended: false }, user: world.admin, overrideAccess: false, context: quiet })
    expect((await publicProfiles(world)).docs).toHaveLength(1)
  })

  it('a provider reads and updates only their own profile; pending drafts are private to the owner', async () => {
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-profiles', id: profileId, data: { bio: 'Mine, pending' }, draft: true, user: owner, overrideAccess: false })
    // Another provider (or anyone) sees at most the published state, never the pending text.
    const seenByOther = await payload
      .findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: other, overrideAccess: false })
      .catch(() => null)
    expect(seenByOther?.bio).not.toBe('Mine, pending')
    await expect(
      payload.update({ collection: 'creator-profiles', id: profileId, data: { bio: 'x' }, draft: true, user: other, overrideAccess: false }),
    ).rejects.toThrow()
    const mine = await payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: owner, overrideAccess: false })
    expect(mine.bio).toBe('Mine, pending')
  })

  it('code and user cannot be changed by anyone, admin included', async () => {
    const payload = await getTestPayload()
    const before = await payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: world.admin, overrideAccess: false })
    // Through the API the fields are write-protected: the attempt is ignored.
    for (const user of [owner, world.admin]) {
      await payload.update({ collection: 'creator-profiles', id: profileId, data: { code: 'AAAAA', user: other.id } as never, draft: true, user, overrideAccess: false })
    }
    const after = await payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: world.admin, overrideAccess: false, depth: 0 })
    expect(after.code).toBe(before.code)
    expect(after.user).toBe(owner.id)
    // Server code that bypasses field access is stopped by the hook (creators.code.immutable).
    await expect(
      payload.update({ collection: 'creator-profiles', id: profileId, data: { code: 'AAAAA' } as never, draft: true }),
    ).rejects.toThrow(/immutable/)
    await expect(
      payload.update({ collection: 'creator-profiles', id: profileId, data: { user: other.id } as never, draft: true }),
    ).rejects.toThrow(/immutable/)
  })

  it('delete is admin only', async () => {
    const payload = await getTestPayload()
    await expect(payload.delete({ collection: 'creator-profiles', id: profileId, user: owner, overrideAccess: false })).rejects.toThrow()
    await expect(payload.delete({ collection: 'creator-profiles', id: profileId, overrideAccess: false })).rejects.toThrow()
  })

  it('private fields: the owner id is absent from public and other-provider reads, present for owner and admin', async () => {
    const payload = await getTestPayload()
    const anonymous = await payload.find({ collection: 'creator-profiles', overrideAccess: false, depth: 0 })
    expect(anonymous.docs[0]).not.toHaveProperty('user')
    const asOther = await payload.findByID({ collection: 'creator-profiles', id: profileId, user: other, overrideAccess: false, depth: 0 })
    expect(asOther).not.toHaveProperty('user')
    const asOwner = await payload.findByID({ collection: 'creator-profiles', id: profileId, user: owner, overrideAccess: false, depth: 0 })
    expect(asOwner.user).toBe(owner.id)
    const asAdmin = await payload.findByID({ collection: 'creator-profiles', id: profileId, user: world.admin, overrideAccess: false, depth: 0 })
    expect(asAdmin.user).toBe(owner.id)
    // And it cannot be probed through a query.
    await expect(payload.find({ collection: 'creator-profiles', where: { user: { equals: owner.id } }, overrideAccess: false })).rejects.toThrow()
  })

  it('listings: never readable by anonymous or other providers; the owner reads only their own, with the review note', async () => {
    const payload = await getTestPayload()
    const listing = await listingOf(world, profileId)
    await payload.update({ collection: 'creator-listings', id: listing!.id, data: { reviewNote: 'Add a wedding sample' }, user: world.admin, overrideAccess: false, context: quiet })
    await expect(payload.find({ collection: 'creator-listings', overrideAccess: false })).rejects.toThrow()
    expect((await payload.find({ collection: 'creator-listings', user: other, overrideAccess: false })).docs.map((d) => d.profile)).not.toContain(profileId)
    const mine = await payload.find({ collection: 'creator-listings', user: owner, overrideAccess: false })
    expect(mine.docs).toHaveLength(1)
    expect(mine.docs[0]?.reviewNote).toBe('Add a wedding sample')
  })

  it('listings: the owner may change active only; create and delete are refused for everyone', async () => {
    const payload = await getTestPayload()
    const listing = (await listingOf(world, profileId))!
    const changed = await payload.update({
      collection: 'creator-listings',
      id: listing.id,
      data: { active: false, featured: true, suspended: true, reviewNote: 'self', submittedAt: new Date().toISOString(), verifiedAt: '2001-01-01T00:00:00.000Z' },
      user: owner,
      overrideAccess: false,
      context: quiet,
    })
    expect(changed).toMatchObject({ active: false, featured: false, suspended: false, reviewNote: 'Add a wedding sample' })
    expect(changed.verifiedAt).toBe(listing.verifiedAt)
    await payload.update({ collection: 'creator-listings', id: listing.id, data: { active: true }, user: owner, overrideAccess: false, context: quiet })

    for (const user of [owner, world.admin]) {
      await expect(
        payload.create({ collection: 'creator-listings', data: { profile: profileId, user: owner.id }, user, overrideAccess: false }),
      ).rejects.toThrow()
      await expect(payload.delete({ collection: 'creator-listings', id: listing.id, user, overrideAccess: false })).rejects.toThrow()
    }
    await expect(payload.update({ collection: 'creator-listings', id: listing.id, data: { active: false }, user: other, overrideAccess: false })).rejects.toThrow()
  })

  it('REST bypass: a provider cannot publish, or write live, unless auto-publish applies; nothing changes', async () => {
    const payload = await getTestPayload()
    const fresh = await makeProvider(world)
    const id = (await createDraft(world, fresh)).id
    const attempt = (data: Record<string, unknown>, draft: boolean) =>
      payload.update({ collection: 'creator-profiles', id, data: data as never, draft, user: fresh, overrideAccess: false, context: quiet })
    await expect(attempt({ _status: 'published', displayName: 'Sneaky' }, false)).rejects.toThrow(/mustBeDraft/)
    await expect(attempt({ _status: 'published', displayName: 'Sneaky' }, true)).rejects.toThrow(/mustBeDraft/)
    await expect(attempt({ displayName: 'Sneaky' }, false)).rejects.toThrow(/mustBeDraft/)
    expect((await publicProfiles(world)).docs.map((d) => d.displayName)).not.toContain('Sneaky')
    const mine = await payload.findByID({ collection: 'creator-profiles', id, draft: true, user: fresh, overrideAccess: false })
    expect(mine._status).toBe('draft')
    expect(mine.displayName).not.toBe('Sneaky')
    // Creating a profile as a live document is refused too.
    await expect(
      payload.create({ collection: 'creator-profiles', data: { displayName: 'Live Create', personas: [world.personas.photographer], _status: 'published' } as never, user: await makeProvider(world), overrideAccess: false, context: quiet }),
    ).rejects.toThrow(/mustBeDraft/)
  })
})
