import { revalidateTag } from 'next/cache'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, listingOf, makeProvider, publicProfiles, publish, type CreatorWorld } from './setup/creators'

describe('CP-US3-S2 / S3 verification is publishing', () => {
  let world: CreatorWorld
  beforeAll(async () => {
    world = await creatorWorld()
  })

  const unpublish = (id: number) =>
    world.payload.update({ collection: 'creator-profiles', id, data: { _status: 'draft' } as never, draft: false, user: world.admin, overrideAccess: false, context: quiet })

  it('CP-US3-S2 publishing makes the profile public and stamps verifiedAt once; unpublishing hides it and keeps the stamp', async () => {
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider, { displayName: 'Verify Me' })
    expect((await publicProfiles(world)).docs.map((d) => d.id)).not.toContain(profile.id)

    await publish(world, profile.id)
    expect((await publicProfiles(world)).docs.map((d) => d.id)).toContain(profile.id)
    const stamp = (await listingOf(world, profile.id))!.verifiedAt
    expect(stamp).toBeTruthy()

    await unpublish(profile.id)
    expect((await publicProfiles(world)).docs.map((d) => d.id)).not.toContain(profile.id)
    expect((await listingOf(world, profile.id))!.verifiedAt).toBe(stamp)

    await publish(world, profile.id)
    expect((await publicProfiles(world)).docs.map((d) => d.id)).toContain(profile.id)
    expect((await listingOf(world, profile.id))!.verifiedAt).toBe(stamp)
  })

  it('CP-US3-S3 a provider\'s edit of a live profile stays a draft: the public text does not change', async () => {
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider, { bio: 'Approved' })
    await publish(world, profile.id)
    await world.payload.update({ collection: 'creator-profiles', id: profile.id, data: { bio: 'Edited' }, draft: true, user: provider, overrideAccess: false, context: quiet })
    expect((await publicProfiles(world)).docs.find((d) => d.id === profile.id)?.bio).toBe('Approved')
    const mine = await world.payload.findByID({ collection: 'creator-profiles', id: profile.id, draft: true, user: provider, overrideAccess: false })
    expect(mine.bio).toBe('Edited')
    // Re-approving publishes exactly what the admin saw.
    await publish(world, profile.id)
    expect((await publicProfiles(world)).docs.find((d) => d.id === profile.id)?.bio).toBe('Edited')
  })

  it('CP-US3-S3 with the setting on, a verified provider may publish; an unverified one is forced back to a draft', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { autoPublishEdits: true }, context: quiet })
    const verified = await makeProvider(world)
    const live = await createDraft(world, verified, { bio: 'Before' })
    await publish(world, live.id)
    await payload.update({ collection: 'creator-profiles', id: live.id, data: { bio: 'After', _status: 'published' } as never, draft: false, user: verified, overrideAccess: false, context: quiet })
    expect((await publicProfiles(world)).docs.find((d) => d.id === live.id)?.bio).toBe('After')

    const newcomer = await makeProvider(world)
    const draft = await createDraft(world, newcomer)
    await expect(
      payload.update({ collection: 'creator-profiles', id: draft.id, data: { bio: 'Sneaky', _status: 'published' } as never, draft: false, user: newcomer, overrideAccess: false, context: quiet }),
    ).rejects.toThrow(/mustBeDraft/)
    expect((await publicProfiles(world)).docs.map((d) => d.id)).not.toContain(draft.id)
    await payload.updateGlobal({ slug: 'site-settings', data: { autoPublishEdits: false }, context: quiet })
  })

  it('CP-US3-S3 with the setting off, a verified provider\'s attempt to write live is refused and the live profile is untouched', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { autoPublishEdits: false }, context: quiet })
    const verified = await makeProvider(world)
    const live = await createDraft(world, verified, { bio: 'Approved' })
    await publish(world, live.id)
    const attempts = [
      { data: { bio: 'Off again', _status: 'published' }, draft: false },
      { data: { bio: 'Off again' }, draft: false },
      { data: { bio: 'Off again', _status: 'published' }, draft: true },
    ]
    for (const { data, draft } of attempts) {
      await expect(
        payload.update({ collection: 'creator-profiles', id: live.id, data: data as never, draft, user: verified, overrideAccess: false, context: quiet }),
      ).rejects.toThrow(/mustBeDraft/)
    }
    // Still public, with the approved text and no leaked edits.
    expect((await publicProfiles(world)).docs.find((d) => d.id === live.id)?.bio).toBe('Approved')
  })

  it('CP-US3-S2 publishing and unpublishing revalidate the creators tag, so the change is live within seconds', async () => {
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    vi.mocked(revalidateTag).mockClear()
    await publish(world, profile.id, {}, {})
    expect(revalidateTag).toHaveBeenCalledWith('creators', 'max')
    vi.mocked(revalidateTag).mockClear()
    await world.payload.update({ collection: 'creator-profiles', id: profile.id, data: { _status: 'draft' } as never, draft: false, user: world.admin, overrideAccess: false })
    expect(revalidateTag).toHaveBeenCalledWith('creators', 'max')
  })

  it('CP-US3-S2 an admin suspension hides a published profile at once and leaves the pending edits unpublished; the note is the owner\'s alone', async () => {
    const provider = await makeProvider(world)
    const other = await makeProvider(world)
    const profile = await createDraft(world, provider, { bio: 'Approved' })
    await publish(world, profile.id)
    await world.payload.update({ collection: 'creator-profiles', id: profile.id, data: { bio: 'Pending' }, draft: true, user: provider, overrideAccess: false, context: quiet })
    const listing = (await listingOf(world, profile.id))!
    await world.payload.update({ collection: 'creator-listings', id: listing.id, data: { suspended: true, reviewNote: 'Please add real samples' }, user: world.admin, overrideAccess: false, context: quiet })

    expect((await publicProfiles(world)).docs.map((d) => d.id)).not.toContain(profile.id)
    const mine = await world.payload.findByID({ collection: 'creator-profiles', id: profile.id, draft: true, user: provider, overrideAccess: false })
    expect(mine.bio).toBe('Pending')
    const ownerView = await world.payload.find({ collection: 'creator-listings', user: provider, overrideAccess: false })
    expect(ownerView.docs[0]).toMatchObject({ suspended: true, reviewNote: 'Please add real samples' })
    const otherView = await world.payload.find({ collection: 'creator-listings', user: other, overrideAccess: false })
    expect(otherView.docs.map((d) => d.reviewNote)).not.toContain('Please add real samples')

    await world.payload.update({ collection: 'creator-listings', id: listing.id, data: { suspended: false }, user: world.admin, overrideAccess: false, context: quiet })
    expect((await publicProfiles(world)).docs.find((d) => d.id === profile.id)?.bio).toBe('Approved')
  })
})
