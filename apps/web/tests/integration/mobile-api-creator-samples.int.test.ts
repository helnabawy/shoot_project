import { creatorProfileV1, myProfileV1 } from '@shoot/domain/api/v1'
import sharp from 'sharp'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { GET as publicProfileRoute } from '@/app/(payload)/api/mobile/v1/creators/[code]/route'
import { PATCH as patchRoute } from '@/app/(payload)/api/mobile/v1/me/creator/profile/route'
import { POST as sampleRoute } from '@/app/(payload)/api/mobile/v1/me/creator/profile/samples/route'
import type { RouteHandler } from '@/shared/api/handler'
import { creatorWorld, publish, type CreatorWorld } from './setup/creators'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

/** MW-FR-018 work samples added in the app: where each one is stored and who sees it. */

type Who = { email: string }
async function tokenFor(user: Who) {
  const payload = await getTestPayload()
  return (await payload.login({ collection: 'users', data: { email: user.email, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, path: string, token: string | null, opts: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  )
}

async function ok<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBe(200)
  return schema.parse(await res.json())
}

/** A phone-sized photo, as the app sends it: base64 in JSON, no caption. */
async function photo(name: string) {
  const data = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#7a5c3e' } }).jpeg().toBuffer()
  return { kind: 'image', caption: { en: '', ar: '' }, specialty: null, file: { contentType: 'image/jpeg', filename: name, data: data.toString('base64') } }
}

describe('MW-FR-018 work samples added in the app', () => {
  let world: CreatorWorld
  let token: string
  let code: string
  let profileId: number

  const stored = async (draft: boolean) =>
    (await world.payload.findByID({ collection: 'creator-profiles', id: profileId, draft, depth: 0, overrideAccess: true })).samples ?? []

  beforeAll(async () => {
    world = await creatorWorld()
    const provider = await createUser(['member'], { accountType: 'provider', persona: [world.personas.photographer], name: 'Nour Ali' })
    token = await tokenFor(provider as Who)
    const saved = await ok(
      await call(patchRoute, 'me/creator/profile', token, { method: 'PATCH', body: { displayName: { en: 'Nour Ali', ar: '' }, gender: 'woman', languages: ['en'], emirates: [String(world.dubai)], specialties: [String(world.category)] } }),
      myProfileV1,
    )
    code = saved.code
    profileId = (await world.payload.find({ collection: 'creator-profiles', where: { code: { equals: code } }, draft: true, limit: 1, depth: 0, overrideAccess: true })).docs[0]!.id
  })

  it('MW-FR-018 a sample added before verification shows in the editor and to the team', async () => {
    const view = await ok(await call(sampleRoute, 'me/creator/profile/samples', token, { method: 'POST', body: await photo('one.jpg') }), myProfileV1)
    expect(view.samples).toHaveLength(1)
    expect(view.samples[0]?.image?.sizes.length).toBeGreaterThan(0)
    expect(await stored(true)).toHaveLength(1)
    const media = await world.payload.find({ collection: 'media', user: world.admin, overrideAccess: false, depth: 0, pagination: false })
    // Payload renames a file whose name is taken on disk (`one-1.jpg`).
    expect(media.docs.some((m) => /^one(-\d+)?\.jpg$/.test(m.filename ?? ''))).toBe(true)
  })

  it('MW-FR-018 a verified creator with review on: the sample waits as a draft the team can see', async () => {
    await publish(world, profileId)
    const view = await ok(await call(sampleRoute, 'me/creator/profile/samples', token, { method: 'POST', body: await photo('two.jpg') }), myProfileV1)
    expect(view.samples).toHaveLength(2)
    expect(view.hasPendingChanges).toBe(true)
    expect(await stored(true)).toHaveLength(2)
    const shown = await ok(await call(publicProfileRoute, `creators/${code}`, null, { params: { code } }), creatorProfileV1)
    expect(shown.samples).toHaveLength(1)
  })

  it('MW-FR-018 a verified creator with auto-publish on: the sample is public at once', async () => {
    await world.payload.updateGlobal({ slug: 'site-settings', data: { autoPublishEdits: true }, context: quiet })
    const view = await ok(await call(sampleRoute, 'me/creator/profile/samples', token, { method: 'POST', body: await photo('three.jpg') }), myProfileV1)
    expect(view.samples).toHaveLength(3)
    expect(view.hasPendingChanges).toBe(false)
    expect(await stored(false)).toHaveLength(3)
    const shown = await ok(await call(publicProfileRoute, `creators/${code}`, null, { params: { code } }), creatorProfileV1)
    expect(shown.samples).toHaveLength(3)
  })

  it('MW-FR-018 with auto-publish on, a creator with no Arabic name saves the profile too', async () => {
    const view = await ok(await call(patchRoute, 'me/creator/profile', token, { method: 'PATCH', body: { bio: { en: 'Portraits in Dubai.', ar: '' } } }), myProfileV1)
    expect(view.fields.displayName).toEqual({ en: 'Nour Ali', ar: '' })
    expect(view.hasPendingChanges).toBe(false)
    const arabic = await world.payload.findByID({ collection: 'creator-profiles', id: profileId, locale: 'ar', fallbackLocale: 'en', depth: 0, overrideAccess: true })
    expect(arabic.displayName).toBe('Nour Ali')
    expect(arabic.bio).toBe('Portraits in Dubai.')
  })
})
