import { beforeAll, describe, expect, it, vi } from 'vitest'
import { revalidateTag } from 'next/cache'
import { getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, listingOf, makeProvider, publicProfiles, publish, type CreatorWorld } from './setup/creators'

describe('CP-FR-002 listing standing is immediate and never publishes pending edits (research §18)', () => {
  let world: CreatorWorld
  let provider: Awaited<ReturnType<typeof makeProvider>>
  let profileId: number

  const setListing = async (data: Record<string, unknown>, user = world.admin, context: Record<string, unknown> = quiet) => {
    const listing = (await listingOf(world, profileId))!
    return world.payload.update({ collection: 'creator-listings', id: listing.id, data, user, overrideAccess: false, context })
  }
  const publicText = async () => (await publicProfiles(world)).docs[0]?.bio

  beforeAll(async () => {
    world = await creatorWorld()
    provider = await makeProvider(world)
    const draft = await createDraft(world, provider, { bio: 'Approved text' })
    profileId = draft.id
  })

  it('creating a profile creates exactly one listing (active, user copied)', async () => {
    const found = await world.payload.find({ collection: 'creator-listings', where: { profile: { equals: profileId } }, depth: 0 })
    expect(found.docs).toHaveLength(1)
    expect(found.docs[0]).toMatchObject({ active: true, suspended: false, featured: false, user: provider.id })
    expect(found.docs[0]?.verifiedAt ?? null).toBeNull()
  })

  it('publishing stamps verifiedAt once and clears submittedAt', async () => {
    await world.payload.update({ collection: 'creator-listings', id: (await listingOf(world, profileId))!.id, data: { submittedAt: '2026-11-07T08:00:00.000Z' }, overrideAccess: true, context: quiet })
    await publish(world, profileId)
    const first = (await listingOf(world, profileId))!
    expect(first.verifiedAt).toBeTruthy()
    expect(first.submittedAt ?? null).toBeNull()
    await publish(world, profileId, { bio: 'Approved text' })
    expect((await listingOf(world, profileId))!.verifiedAt).toBe(first.verifiedAt)
  })

  it('pause, suspend and feature take effect on the next public read while pending text stays unpublished', async () => {
    await world.payload.update({ collection: 'creator-profiles', id: profileId, data: { bio: 'Pending text' }, draft: true, user: provider, overrideAccess: false, context: quiet })
    expect(await publicText()).toBe('Approved text')

    await setListing({ active: false }, provider)
    expect((await publicProfiles(world)).docs).toHaveLength(0)
    await setListing({ active: true }, provider)
    expect(await publicText()).toBe('Approved text')

    await setListing({ suspended: true })
    expect((await publicProfiles(world)).docs).toHaveLength(0)
    await setListing({ suspended: false })
    expect(await publicText()).toBe('Approved text')

    await setListing({ featured: true })
    expect((await listingOf(world, profileId))!.featured).toBe(true)
    expect(await publicText()).toBe('Approved text')
    // The pending draft is still the owner's draft, not published.
    const mine = await world.payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, user: provider, overrideAccess: false })
    expect(mine.bio).toBe('Pending text')
  })

  it('every listing change revalidates the creators tag; draft saves of an already pending draft do not', async () => {
    const payload = await getTestPayload()
    vi.mocked(revalidateTag).mockClear()
    await setListing({ active: false }, provider, {})
    expect(revalidateTag).toHaveBeenCalledWith('creators', 'max')
    await setListing({ active: true }, provider, {})

    vi.mocked(revalidateTag).mockClear()
    await payload.update({ collection: 'creator-profiles', id: profileId, data: { bio: 'Pending again' }, draft: true, user: provider, overrideAccess: false })
    await payload.update({ collection: 'creator-profiles', id: profileId, data: { bio: 'Pending once more' }, draft: true, user: provider, overrideAccess: false })
    // At most the first draft over a published version may revalidate; the second never does.
    expect(vi.mocked(revalidateTag).mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('deleting a profile with no briefs deletes its listing', async () => {
    const payload = await getTestPayload()
    const other = await makeProvider(world)
    const id = (await createDraft(world, other)).id
    expect((await payload.find({ collection: 'creator-listings', where: { profile: { equals: id } }, depth: 0 })).docs).toHaveLength(1)
    await payload.delete({ collection: 'creator-profiles', id, user: world.admin, overrideAccess: false, context: quiet })
    expect((await payload.find({ collection: 'creator-listings', where: { profile: { equals: id } }, depth: 0 })).docs).toHaveLength(0)
  })
})
