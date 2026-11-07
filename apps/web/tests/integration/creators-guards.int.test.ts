import { beforeAll, describe, expect, it } from 'vitest'
import { getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'

describe('CP-FR-009 delete guards and audience rules', () => {
  let world: CreatorWorld
  beforeAll(async () => {
    world = await creatorWorld()
  })

  const adminCreates = async (provider: { id: number }, over: Record<string, unknown>) =>
    world.payload.create({
      collection: 'creator-profiles',
      data: { displayName: 'Guard Test', personas: [world.personas.photographer], _status: 'draft', user: provider.id, ...over } as never,
      draft: true,
      user: world.admin,
      overrideAccess: false,
      context: quiet,
    })

  it('refuses to delete a persona a profile uses, then allows it once the profile is gone', async () => {
    const payload = await getTestPayload()
    const teacher = await payload.create({ collection: 'personas', data: { singular: 'Teacher', plural: 'Teachers', slug: 'teacher' }, context: quiet })
    const provider = await makeProvider(world)
    const profile = await adminCreates(provider, { personas: [teacher.id] })
    await expect(payload.delete({ collection: 'personas', id: teacher.id })).rejects.toThrow(/creator profile/)
    await payload.delete({ collection: 'creator-profiles', id: profile.id, context: quiet })
    await expect(payload.delete({ collection: 'personas', id: teacher.id })).resolves.toBeTruthy()
  })

  it('refuses to delete a category used as a specialty or a sample category, published or draft', async () => {
    const payload = await getTestPayload()
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    await publish(world, profile.id)
    await expect(payload.delete({ collection: 'categories', id: world.category })).rejects.toThrow(/creator profile/)
    // A reference that exists only in a pending draft counts too.
    const extra = await payload.create({
      collection: 'categories',
      data: { name: 'Extra', slug: 'extra', personas: [world.personas.photographer] },
      context: quiet,
    })
    await payload.update({ collection: 'creator-profiles', id: profile.id, data: { specialties: [world.category, extra.id] }, draft: true, user: provider, overrideAccess: false, context: quiet })
    await expect(payload.delete({ collection: 'categories', id: extra.id })).rejects.toThrow(/creator profile/)
  })

  it('refuses to delete a location a profile lists', async () => {
    const payload = await getTestPayload()
    const provider = await makeProvider(world)
    // Profiles list emirates only (CP-FR-012); an emirate a profile lists cannot be deleted.
    await createDraft(world, provider, { cities: [world.abuDhabi] })
    await expect(payload.delete({ collection: 'locations', id: world.abuDhabi })).rejects.toThrow(/creator profile/)
  })

  it('refuses to delete a user who has a profile', async () => {
    const payload = await getTestPayload()
    const provider = await makeProvider(world)
    await createDraft(world, provider)
    await expect(payload.delete({ collection: 'users', id: provider.id })).rejects.toThrow(/creator profile/)
  })

  it('refuses to delete a media file used as photo or sample, including in a pending draft only', async () => {
    const payload = await getTestPayload()
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    await publish(world, profile.id)
    const photo = await uploadImage(world, provider, 'photo.png')
    await payload.update({ collection: 'creator-profiles', id: profile.id, data: { photo: photo.id }, draft: true, user: provider, overrideAccess: false, context: quiet })
    await expect(payload.delete({ collection: 'media', id: photo.id })).rejects.toThrow(/creator profile/)
    const sample = await uploadImage(world, provider, 'sample.png')
    await payload.update({
      collection: 'creator-profiles',
      id: profile.id,
      data: { samples: [{ kind: 'image', image: sample.id, category: world.category }] } as never,
      draft: true,
      user: provider,
      overrideAccess: false,
      context: quiet,
    })
    await expect(payload.delete({ collection: 'media', id: sample.id })).rejects.toThrow(/creator profile/)
    const spare = await uploadImage(world, provider, 'spare.png')
    await expect(payload.delete({ collection: 'media', id: spare.id, user: provider, overrideAccess: false })).resolves.toBeTruthy()
  })

  it('refuses to delete a profile that briefs reference; with none, deletes it', async () => {
    const payload = await getTestPayload()
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    await payload.create({
      collection: 'briefs',
      data: { persona: [world.personas.photographer], creator: profile.id } as never,
      context: { ...quiet, creatorResolved: true },
    })
    await expect(payload.delete({ collection: 'creator-profiles', id: profile.id })).rejects.toThrow(/brief/)
    const lonely = await createDraft(world, await makeProvider(world))
    await expect(payload.delete({ collection: 'creator-profiles', id: lonely.id })).resolves.toBeTruthy()
  })

  it('a client-supplied creator on a brief is dropped; only the server action may set it', async () => {
    const payload = await getTestPayload()
    const profile = await createDraft(world, await makeProvider(world))
    const brief = await payload.create({ collection: 'briefs', data: { persona: [world.personas.photographer], creator: profile.id } as never, context: quiet })
    expect(brief.creator ?? null).toBeNull()
  })

  it('a provider cannot newly choose a persona outside the audience; the profile stays reachable', async () => {
    const payload = await getTestPayload()
    const hidden = await payload.create({ collection: 'personas', data: { singular: 'Chef', plural: 'Chefs', slug: 'chef' }, context: quiet })
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    await publish(world, profile.id)
    await expect(
      payload.update({ collection: 'creator-profiles', id: profile.id, data: { personas: [world.personas.photographer, hidden.id] }, draft: true, user: provider, overrideAccess: false }),
    ).rejects.toThrow()
    // Leaving the audience later does not hide the profile from direct reads.
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [world.personas.videographer] }, context: quiet })
    const read = await payload.findByID({ collection: 'creator-profiles', id: profile.id, overrideAccess: false })
    expect(read.id).toBe(profile.id)
    // Personas already on the profile may stay when it is edited.
    await expect(
      payload.update({ collection: 'creator-profiles', id: profile.id, data: { bio: 'Still fine' }, draft: true, user: provider, overrideAccess: false }),
    ).resolves.toBeTruthy()
  })

  it('a specialty must belong to one of the profile’s personas', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [world.personas.photographer, world.personas.videographer] }, context: quiet })
    const teacher = await payload.create({ collection: 'personas', data: { singular: 'Tutor', plural: 'Tutors', slug: 'tutor' }, context: quiet })
    const math = await payload.create({ collection: 'categories', data: { name: 'Math', slug: 'math', personas: [teacher.id] }, context: quiet })
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider)
    await expect(
      payload.update({ collection: 'creator-profiles', id: profile.id, data: { specialties: [math.id] }, draft: true, user: provider, overrideAccess: false }),
    ).rejects.toThrow()
  })
})
