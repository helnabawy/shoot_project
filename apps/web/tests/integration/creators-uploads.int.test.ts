import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { createUser, getTestPayload, quiet } from './setup/payload'
import { creatorWorld, makeProvider, type CreatorUser, type CreatorWorld } from './setup/creators'

describe('CP-FR-008 provider uploads are bounded (research §6)', () => {
  let world: CreatorWorld
  let tiny: Buffer

  const upload = (user: CreatorUser, over: { data?: Buffer; mimetype?: string; name?: string; visitor?: string } = {}) => {
    const data = over.data ?? tiny
    return world.payload.create({
      collection: 'media',
      data: { alt: 'A sample' },
      file: { data, mimetype: over.mimetype ?? 'image/png', name: over.name ?? `u-${Math.random().toString(36).slice(2)}.png`, size: data.length },
      user,
      overrideAccess: false,
      context: { ...quiet, visitorId: over.visitor ?? `v-${user.id}` },
    })
  }

  beforeAll(async () => {
    world = await creatorWorld()
    tiny = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#777777' } }).png().toBuffer()
  })

  it('a provider uploads an image and is recorded as the uploader; a seeker cannot upload', async () => {
    const provider = await makeProvider(world)
    const media = await upload(provider)
    // The uploader id is private: the owner's own response omits it, the database holds it.
    expect(media).not.toHaveProperty('uploadedBy')
    const stored = await world.payload.findByID({ collection: 'media', id: media.id, depth: 0 })
    expect(stored.uploadedBy).toBe(provider.id)
    await expect(upload(await createUser(['member']))).rejects.toThrow()
    await expect(
      world.payload.create({ collection: 'media', data: { alt: 'x' }, file: { data: tiny, mimetype: 'image/png', name: 'anon.png', size: tiny.length }, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('refuses a type other than JPEG, PNG or WebP', async () => {
    const provider = await makeProvider(world)
    const gif = await sharp(tiny).gif().toBuffer()
    await expect(upload(provider, { data: gif, mimetype: 'image/gif', name: 'a.gif' })).rejects.toThrow(/media\.upload\.type/)
  })

  it('refuses a file over 5 MB with the size message', async () => {
    const provider = await makeProvider(world)
    const big = await sharp(randomBytes(2000 * 2000 * 3), { raw: { width: 2000, height: 2000, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer()
    expect(big.length).toBeGreaterThan(5 * 1024 * 1024)
    await expect(upload(provider, { data: big, name: 'big.png' })).rejects.toThrow(/media\.upload\.size/)
  }, 120_000)

  it('refuses the 61st owned file with the quota message', async () => {
    const provider = await makeProvider(world)
    // Existing files count against the quota even when uploaded long ago.
    for (let i = 0; i < 60; i += 1) {
      await world.payload.create({
        collection: 'media',
        data: { alt: 'seed', uploadedBy: provider.id } as never,
        file: { data: tiny, mimetype: 'image/png', name: `q-${provider.id}-${i}.png`, size: tiny.length },
        overrideAccess: true,
        context: quiet,
      })
    }
    await expect(upload(provider)).rejects.toThrow(/media\.upload\.quota/)
  }, 120_000)

  it('refuses the 21st upload by one account within an hour with 429, and succeeds after the window', async () => {
    const provider = await makeProvider(world)
    for (let i = 0; i < 20; i += 1) await upload(provider)
    await expect(upload(provider)).rejects.toMatchObject({ status: 429, message: 'media.upload.tooMany' })

    const payload = await getTestPayload()
    const rows = await payload.find({ collection: 'rate-limits', where: { key: { like: `upload:` } }, limit: 100, depth: 0 })
    for (const row of rows.docs) {
      await payload.update({ collection: 'rate-limits', id: row.id, data: { windowStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() } })
    }
    await expect(upload(provider)).resolves.toBeTruthy()
  }, 180_000)

  it('refuses the 41st upload by one visitor across accounts with 429', async () => {
    const visitor = 'shared-visitor'
    const accounts = [await makeProvider(world), await makeProvider(world), await makeProvider(world)]
    for (const account of accounts.slice(0, 2)) for (let i = 0; i < 20; i += 1) await upload(account, { visitor })
    await expect(upload(accounts[2]!, { visitor })).rejects.toMatchObject({ status: 429, message: 'media.upload.tooMany' })
  }, 180_000)

  it('editors are never limited and may upload any image type', async () => {
    const editor = await createUser(['editor'])
    const gif = await sharp(tiny).gif().toBuffer()
    for (let i = 0; i < 22; i += 1) await upload(editor, { visitor: 'editor-visitor' })
    await expect(upload(editor, { data: gif, mimetype: 'image/gif', name: 'e.gif' })).resolves.toBeTruthy()
  }, 120_000)

  it('a provider may update or delete only the files they uploaded', async () => {
    const owner = await makeProvider(world)
    const other = await makeProvider(world)
    const mine = await upload(owner, { visitor: 'own-1' })
    await expect(world.payload.update({ collection: 'media', id: mine.id, data: { alt: 'Changed' }, user: other, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.delete({ collection: 'media', id: mine.id, user: other, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.update({ collection: 'media', id: mine.id, data: { alt: 'Changed' }, user: owner, overrideAccess: false })).resolves.toBeTruthy()
  })

  it('the uploader is not exposed to public reads', async () => {
    const provider = await makeProvider(world)
    const media = await upload(provider, { visitor: 'own-2' })
    const publicRead = await world.payload.findByID({ collection: 'media', id: media.id, overrideAccess: false, depth: 0 })
    expect(publicRead).not.toHaveProperty('uploadedBy')
  })
})
