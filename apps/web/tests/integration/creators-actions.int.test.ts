import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createUser, getTestPayload, quiet } from './setup/payload'
import { creatorWorld, listingOf, makeProvider, publicProfiles, publish, uploadImage, type CreatorUser, type CreatorWorld } from './setup/creators'

/** The real provider actions against the test database; only Next's request APIs are stubbed. */
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
  draftMode: async () => ({ isEnabled: false }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  },
}))
vi.mock('@/i18n/navigation', () => ({
  redirect: (arg: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(arg)}`)
  },
}))

const actions = await import('@/modules/creators/actions')
const { getMyProfile } = await import('@/modules/creators/my-profile')

const idle = { status: 'idle' } as const

function form(entries: Record<string, string | string[] | File | undefined>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  }
  return data
}

async function signIn(user: CreatorUser) {
  const payload = await getTestPayload()
  const { token } = await payload.login({ collection: 'users', data: { email: user.email as string, password: 'password-123' } })
  jar.set('payload-token', token as string)
}

describe('CP-US3-S1 provider actions', () => {
  let world: CreatorWorld
  let png: Buffer
  const file = (data: Buffer, name: string, type: string) => new File([new Uint8Array(data)], name, { type })

  const profileForm = (over: Record<string, string | string[] | File | undefined> = {}) =>
    form({
      locale: 'en',
      displayName_en: 'Sara Khan',
      displayName_ar: 'سارة خان',
      bio_en: 'Weddings and portraits.',
      bio_ar: 'أعراس وبورتريه.',
      personas: [String(world.personas.photographer)],
      specialties: [String(world.category), String(world.otherCategory)],
      cities: [String(world.dubai)],
      languages: ['en', 'ar'],
      'social.0.platform': 'instagram',
      'social.0.url': 'https://instagram.com/sara',
      ...over,
    })
  const imageSample = (over: Record<string, string | File | undefined> = {}) =>
    form({ locale: 'en', kind: 'image', image: file(png, 'work.png', 'image/png'), caption_en: 'Golden hour', caption_ar: 'الساعة الذهبية', category: String(world.category), ...over })

  const mine = async (user: CreatorUser) => getMyProfile(user as never)

  beforeAll(async () => {
    world = await creatorWorld()
    png = await sharp({ create: { width: 64, height: 80, channels: 3, background: '#778899' } }).png().toBuffer()
  })
  beforeEach(() => jar.clear())

  it('the first save creates the profile as a draft with a code, both languages and the shared lists', async () => {
    const provider = await makeProvider(world)
    await signIn(provider)
    const state = await actions.saveMyProfile(idle, profileForm())
    expect(state).toMatchObject({ status: 'saved', published: false })
    const profile = (await mine(provider))!
    expect(profile.code).toMatch(/^[2-9A-HJKMNP-Z]{5}$/)
    expect(profile.status).toBe('draft')
    expect(profile.displayName).toEqual({ en: 'Sara Khan', ar: 'سارة خان' })
    expect(profile.bio).toEqual({ en: 'Weddings and portraits.', ar: 'أعراس وبورتريه.' })
    expect(profile.specialties).toEqual([world.category, world.otherCategory])
    expect(profile.languages).toEqual(['en', 'ar'])
    expect(profile.social).toEqual([{ platform: 'instagram', url: 'https://instagram.com/sara' }])
    expect((await publicProfiles(world)).docs.map((d) => d.id)).not.toContain(profile.id)
  })

  it('a second save updates the same profile (one per provider) and keeps its code', async () => {
    const provider = await makeProvider(world)
    await signIn(provider)
    await actions.saveMyProfile(idle, profileForm())
    const first = (await mine(provider))!
    await actions.saveMyProfile(idle, profileForm({ displayName_en: 'Sara K.', bio_ar: '' }))
    const second = (await mine(provider))!
    expect(second.id).toBe(first.id)
    expect(second.code).toBe(first.code)
    expect(second.displayName.en).toBe('Sara K.')
    // A blank Arabic field clears the Arabic text (English then shows through).
    expect(second.bio.ar).toBe('')
  })

  it('reports each invalid field and writes nothing', async () => {
    const provider = await makeProvider(world)
    await signIn(provider)
    const state = await actions.saveMyProfile(idle, profileForm({ displayName_en: 'S', languages: ['xx'], 'social.0.url': 'http://instagram.com/x' }))
    expect(state).toMatchObject({ status: 'error', errors: { displayName_en: 'creators.errors.nameLength', languages: 'creators.errors.languageInvalid', 'social.0.url': 'creators.errors.socialInvalid' } })
    expect(await mine(provider)).toBeNull()
  })

  it('a persona outside the audience is a field error', async () => {
    const payload = await getTestPayload()
    const hidden = await payload.create({ collection: 'personas', data: { singular: 'Chef', plural: 'Chefs', slug: 'chef' }, context: quiet })
    const provider = await makeProvider(world)
    await signIn(provider)
    const state = await actions.saveMyProfile(idle, profileForm({ personas: [String(hidden.id)] }))
    expect(state).toMatchObject({ status: 'error', errors: { personas: 'creators.persona.inactive' } })
  })

  it('a seeker cannot use any action', async () => {
    const seeker = await createUser(['member'])
    await signIn(seeker)
    const denied = { status: 'error', formError: 'creators.errors.notProvider' }
    expect(await actions.saveMyProfile(idle, profileForm())).toMatchObject(denied)
    expect(await actions.addSample(idle, imageSample())).toMatchObject(denied)
    expect(await actions.moveSample(idle, form({ index: '0', direction: 'up' }))).toMatchObject(denied)
    expect(await actions.removeSample(idle, form({ index: '0' }))).toMatchObject(denied)
    expect(await actions.submitForReview(idle, profileForm())).toMatchObject(denied)
    expect(await actions.setProfileActive(idle, form({ active: 'false' }))).toMatchObject(denied)
    jar.clear()
    expect(await actions.saveMyProfile(idle, profileForm())).toMatchObject(denied)
  })

  it('a provider only ever acts on their own profile, whatever ids the form carries', async () => {
    const a = await makeProvider(world)
    const b = await makeProvider(world)
    await signIn(a)
    await actions.saveMyProfile(idle, profileForm({ displayName_en: 'Provider A' }))
    const aProfile = (await mine(a))!
    await signIn(b)
    await actions.saveMyProfile(idle, profileForm({ displayName_en: 'Provider B', id: String(aProfile.id), user: String(a.id) }))
    expect((await mine(a))!.displayName.en).toBe('Provider A')
    expect((await mine(b))!.displayName.en).toBe('Provider B')
    expect((await mine(b))!.id).not.toBe(aProfile.id)
  })

  describe('samples', () => {
    let provider: CreatorUser
    beforeEach(async () => {
      provider = await makeProvider(world)
      await signIn(provider)
      await actions.saveMyProfile(idle, profileForm())
    })

    it('adds an image sample with both captions and its specialty, and refuses before the profile exists', async () => {
      const state = await actions.addSample(idle, imageSample())
      expect(state).toMatchObject({ status: 'saved' })
      const [sample] = (await mine(provider))!.samples
      expect(sample).toMatchObject({ kind: 'image', category: world.category, caption: { en: 'Golden hour', ar: 'الساعة الذهبية' } })
      expect(sample!.image?.url).toBeTruthy()
      const fresh = await makeProvider(world)
      await signIn(fresh)
      expect(await actions.addSample(idle, imageSample())).toMatchObject({ status: 'error', formError: 'creators.errors.noProfile' })
    })

    it('adds a video link with its poster', async () => {
      const state = await actions.addSample(idle, form({ locale: 'en', kind: 'video', videoUrl: 'https://youtu.be/abc', poster: file(png, 'poster.png', 'image/png'), caption_en: 'Showreel' }))
      expect(state).toMatchObject({ status: 'saved' })
      expect((await mine(provider))!.samples[0]).toMatchObject({ kind: 'video', videoUrl: 'https://youtu.be/abc' })
    })

    it.each([
      ['a missing image', () => imageSample({ image: undefined }), { image: 'creators.samples.image' }],
      ['an empty image', () => imageSample({ image: new File([], 'empty.png', { type: 'image/png' }) }), { image: 'creators.samples.image' }],
      ['a specialty the profile does not list', () => imageSample({ category: '99999' }), { category: 'creators.samples.category' }],
      ['a caption over 140 characters', () => imageSample({ caption_en: 'x'.repeat(141) }), { caption_en: 'creators.errors.captionLength' }],
      ['a video on a bad host', () => form({ locale: 'en', kind: 'video', videoUrl: 'https://evil.example/x', poster: file(png, 'p.png', 'image/png') }), { videoUrl: 'creators.errors.videoHost' }],
      ['a video without a poster', () => form({ locale: 'en', kind: 'video', videoUrl: 'https://youtu.be/abc' }), { poster: 'creators.samples.poster' }],
    ] as const)('rejects %s', async (_name, build, expected) => {
      const state = await actions.addSample(idle, build() as FormData)
      expect(state).toMatchObject({ status: 'error', errors: expected })
      expect((await mine(provider))!.samples).toHaveLength(0)
    })

    it('CP-FR-008 accepts a photo of about 4 MB, over a server action\'s default 1 MB and under the 5 MB limit', async () => {
      const photo = await sharp(randomBytes(2200 * 2200 * 3), { raw: { width: 2200, height: 2200, channels: 3 } }).jpeg({ quality: 92 }).toBuffer()
      expect(photo.length).toBeGreaterThan(2 * 1024 * 1024)
      expect(photo.length).toBeLessThan(5 * 1024 * 1024)
      expect(await actions.addSample(idle, imageSample({ image: file(photo, 'big.jpg', 'image/jpeg') }))).toMatchObject({ status: 'saved' })
      expect((await mine(provider))!.samples).toHaveLength(1)
    }, 120_000)

    it('CP-FR-008 rejects a type other than JPEG, PNG or WebP, and a file over 5 MB, with the media messages', async () => {
      const gif = await sharp(png).gif().toBuffer()
      expect(await actions.addSample(idle, imageSample({ image: file(gif, 'a.gif', 'image/gif') }))).toMatchObject({ status: 'error', errors: { image: 'media.upload.type' } })
      expect(await actions.addSample(idle, imageSample({ image: file(Buffer.from('plain text'), 'notes.txt', 'text/plain') }))).toMatchObject({ status: 'error', errors: { image: 'media.upload.type' } })
      const big = await sharp(randomBytes(2000 * 2000 * 3), { raw: { width: 2000, height: 2000, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer()
      expect(await actions.addSample(idle, imageSample({ image: file(big, 'big.png', 'image/png') }))).toMatchObject({ status: 'error', errors: { image: 'media.upload.size' } })
    }, 120_000)

    it('refuses the 31st sample', async () => {
      const payload = await getTestPayload()
      const media = await uploadImage(world, provider, 'thirty.png')
      const profile = (await mine(provider))!
      await payload.update({
        collection: 'creator-profiles',
        id: profile.id,
        data: { samples: Array.from({ length: 30 }, () => ({ kind: 'image', image: media.id })) } as never,
        draft: true,
        user: provider,
        overrideAccess: false,
        context: quiet,
      })
      expect((await mine(provider))!.samples).toHaveLength(30)
      expect(await actions.addSample(idle, imageSample())).toMatchObject({ status: 'error', errors: { sample: 'creators.samples.limit' } })
      expect((await mine(provider))!.samples).toHaveLength(30)
    })

    it('updates a sample\'s caption in one language without losing the other, moves it and removes it', async () => {
      await actions.addSample(idle, imageSample({ caption_en: 'One', caption_ar: 'واحد' }))
      await actions.addSample(idle, imageSample({ caption_en: 'Two', caption_ar: 'اثنان' }))
      await actions.addSample(idle, imageSample({ caption_en: 'Three', caption_ar: 'ثلاثة' }))
      const captions = async () => (await mine(provider))!.samples.map((s) => `${s.caption.en}|${s.caption.ar}`)
      expect(await captions()).toEqual(['One|واحد', 'Two|اثنان', 'Three|ثلاثة'])

      // Row edits travel with the closing save (the same form), with the profile fields unchanged.
      const saved = await actions.saveMyProfile(idle, profileForm({ 'sample.1.caption_en': 'Second', 'sample.1.caption_ar': 'اثنان', 'sample.1.category': String(world.otherCategory) }))
      expect(saved).toMatchObject({ status: 'saved' })
      expect(await captions()).toEqual(['One|واحد', 'Second|اثنان', 'Three|ثلاثة'])
      expect((await mine(provider))!.samples[1]!.category).toBe(world.otherCategory)

      await actions.moveSample(idle, form({ locale: 'en', index: '2', direction: 'up' }))
      expect(await captions()).toEqual(['One|واحد', 'Three|ثلاثة', 'Second|اثنان'])
      await actions.moveSample(idle, form({ locale: 'en', index: '0', direction: 'up' }))
      expect(await captions()).toEqual(['One|واحد', 'Three|ثلاثة', 'Second|اثنان'])

      await actions.removeSample(idle, form({ locale: 'en', index: '0' }))
      expect(await captions()).toEqual(['Three|ثلاثة', 'Second|اثنان'])
      // Removing the row leaves the uploaded file for the cleanup job.
      const payload = await getTestPayload()
      expect((await payload.count({ collection: 'media', where: { uploadedBy: { equals: provider.id } } })).totalDocs).toBeGreaterThanOrEqual(3)
    })

    it('a too-long caption on a row is refused before anything is saved, under the row\'s own field name', async () => {
      await actions.addSample(idle, imageSample({ caption_en: 'Keep' }))
      const state = await actions.saveMyProfile(idle, profileForm({ displayName_en: 'Changed Name', 'sample.0.caption_en': 'x'.repeat(141), 'sample.0.caption_ar': '', 'sample.0.category': '' }))
      expect(state).toMatchObject({ status: 'error', errors: { 'sample.0.caption_en': 'creators.errors.captionLength' } })
      const saved = await mine(provider)
      expect(saved!.samples[0]!.caption.en).toBe('Keep')
      expect(saved!.displayName.en).not.toBe('Changed Name')
    })

    it('a sample can only use an image the provider uploaded', async () => {
      const other = await makeProvider(world)
      const theirs = await uploadImage(world, other, 'theirs.png')
      const payload = await getTestPayload()
      await expect(
        payload.update({
          collection: 'creator-profiles',
          id: (await mine(provider))!.id,
          data: { samples: [{ kind: 'image', image: theirs.id }] } as never,
          draft: true,
          user: provider,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('an invalid index changes nothing', async () => {
      await actions.addSample(idle, imageSample())
      await actions.moveSample(idle, form({ locale: 'en', index: '9', direction: 'down' }))
      await actions.removeSample(idle, form({ locale: 'en', index: '-1' }))
      expect((await mine(provider))!.samples).toHaveLength(1)
    })
  })

  describe('review and visibility', () => {
    it('submit for review lists what is missing and sets the review date on the listing when complete', async () => {
      const provider = await makeProvider(world)
      await signIn(provider)
      const incomplete = await actions.submitForReview(idle, profileForm({ cities: undefined, languages: undefined }))
      expect(incomplete).toMatchObject({ status: 'error', formError: 'creators.submit.incomplete', errors: { cities: expect.any(String), languages: expect.any(String) } })
      expect((await listingOf(world, (await mine(provider))!.id))!.submittedAt ?? null).toBeNull()

      const done = await actions.submitForReview(idle, profileForm())
      expect(done).toMatchObject({ status: 'saved', submitted: true })
      const profile = (await mine(provider))!
      expect((await listingOf(world, profile.id))!.submittedAt).toBeTruthy()
      expect(profile.status).toBe('in-review')
    })

    it('pausing hides the profile at once without publishing a pending draft; resuming shows the approved text again', async () => {
      const provider = await makeProvider(world)
      await signIn(provider)
      await actions.saveMyProfile(idle, profileForm({ bio_en: 'Approved bio' }))
      const id = (await mine(provider))!.id
      await publish(world, id)
      await actions.saveMyProfile(idle, profileForm({ bio_en: 'Pending bio' }))
      expect((await publicProfiles(world)).docs.find((d) => d.id === id)?.bio).toBe('Approved bio')

      expect(await actions.setProfileActive(idle, form({ locale: 'en', active: 'false' }))).toMatchObject({ status: 'saved' })
      expect((await publicProfiles(world)).docs.find((d) => d.id === id)).toBeUndefined()
      expect((await mine(provider))!.status).toBe('paused')

      await actions.setProfileActive(idle, form({ locale: 'en', active: 'true' }))
      expect((await publicProfiles(world)).docs.find((d) => d.id === id)?.bio).toBe('Approved bio')
      expect((await mine(provider))!.status).toBe('live-with-changes')
    })

    it('with auto-publish on, a verified creator\'s save goes live at once; an unverified one stays a draft', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'site-settings', data: { autoPublishEdits: true }, context: quiet })
      const verified = await makeProvider(world)
      await signIn(verified)
      await actions.saveMyProfile(idle, profileForm({ bio_en: 'First' }))
      const id = (await mine(verified))!.id
      await publish(world, id)
      const state = await actions.saveMyProfile(idle, profileForm({ bio_en: 'Live now', bio_ar: 'الآن' }))
      expect(state).toMatchObject({ status: 'saved', published: true })
      expect((await publicProfiles(world)).docs.find((d) => d.id === id)?.bio).toBe('Live now')
      expect((await publicProfiles(world, 'ar')).docs.find((d) => d.id === id)?.bio).toBe('الآن')

      const newcomer = await makeProvider(world)
      await signIn(newcomer)
      expect(await actions.saveMyProfile(idle, profileForm())).toMatchObject({ status: 'saved', published: false })
      await payload.updateGlobal({ slug: 'site-settings', data: { autoPublishEdits: false }, context: quiet })
    })
  })
})
