import { beforeAll, describe, expect, it, vi } from 'vitest'
import { revalidateTag } from 'next/cache'
import { createUser, getTestPayload } from './setup/payload'
import { creatorWorld, type CreatorWorld } from './setup/creators'

describe('locations (research §9)', () => {
  let world: CreatorWorld
  beforeAll(async () => {
    world = await creatorWorld()
  })

  it('a city has an emirate as parent; the parent must not itself have a parent', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.create({ collection: 'locations', data: { name: 'Nested', slug: 'nested', parent: world.city } }),
    ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'locations', data: { name: 'Palm', slug: 'palm', parent: world.dubai } }),
    ).resolves.toMatchObject({ slug: 'palm' })
  })

  it('anyone reads, only admins write', async () => {
    const payload = await getTestPayload()
    expect((await payload.find({ collection: 'locations', overrideAccess: false })).docs.length).toBeGreaterThan(0)
    const editor = await createUser(['editor'])
    await expect(
      payload.create({ collection: 'locations', data: { name: 'Dibba', slug: 'dibba' }, user: editor, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'locations', data: { name: 'Dibba', slug: 'dibba' }, user: world.admin, overrideAccess: false }),
    ).resolves.toBeTruthy()
  })

  it('refuses delete while a city or a profile references it, then allows it', async () => {
    const payload = await getTestPayload()
    await expect(payload.delete({ collection: 'locations', id: world.abuDhabi })).rejects.toThrow(/city/)
    const solo = await payload.create({ collection: 'locations', data: { name: 'Mirdif', slug: 'mirdif' } })
    await expect(payload.delete({ collection: 'locations', id: solo.id })).resolves.toBeTruthy()
  })

  it('revalidates the locations tag', async () => {
    const payload = await getTestPayload()
    vi.mocked(revalidateTag).mockClear()
    await payload.create({ collection: 'locations', data: { name: 'Hatta', slug: 'hatta' } })
    expect(revalidateTag).toHaveBeenCalledWith('locations', 'max')
  })
})
