import { problemV1, resolveV1, type ResolveV1 } from '@shoot/domain/api/v1'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as resolveRoute } from '@/app/(payload)/api/mobile/v1/resolve/route'
import { recordRemovedPath } from '@/modules/pages'
import { createDraft, creatorWorld, makeProvider, publish, type CreatorWorld } from './setup/creators'
import { createGuide, createLegal, createPage, guidesWorld, intentAbout, NOW, translatePage, version, type GuidesWorld } from './setup/pages'
import { quiet } from './setup/payload'

/** MR-US5: which app place a website address is. */

function call(path: string, headers: Record<string, string> = {}) {
  return resolveRoute(new Request(`http://test/api/mobile/v1/resolve?path=${encodeURIComponent(path)}`, { headers }), { params: Promise.resolve({}) })
}

async function resolve(path: string, headers: Record<string, string> = {}): Promise<ResolveV1> {
  const res = await call(path, headers)
  expect(res.status, `${path}: ${await res.clone().text()}`).toBe(200)
  expect(res.headers.get('cache-control')).toContain('public')
  return resolveV1.parse(await res.json())
}

describe('MR-US5 resolve: pages, guides, legal, removed and private addresses', () => {
  let world: GuidesWorld

  beforeAll(async () => {
    world = await guidesWorld()
    const how = await createPage(world, { title: 'How it works', slug: 'how-it-works' })
    await translatePage(world, how.id, { title: 'كيف يعمل', slug: 'kayfa-yamal' })
    const renamed = await createPage(world, { title: 'Studios', slug: 'old-studios' })
    await world.payload.update({ collection: 'pages', id: renamed.id, data: { slug: 'studios', _status: 'published' } as never, draft: false, user: world.editor, overrideAccess: false, context: quiet })
    await createPage(world, { slug: 'proposal-photographer-dubai', kind: 'intent', title: 'Proposal photographer', ...(await intentAbout(world)) })
    await createGuide(world, {})
    await createLegal(world, 'terms', [version('First terms')])
    await recordRemovedPath(world.payload, { kind: 'page', paths: { en: '/summer-offer' } })
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('MR-US5-S1 an editor page, a hire page, a guide, a guide category and legal pages are page answers', async () => {
    expect(await resolve('/how-it-works')).toEqual({ status: 'page', kind: 'page', path: '/how-it-works', locale: 'en', params: { slug: 'how-it-works' } })
    expect(await resolve('/hire/proposal-photographer-dubai')).toMatchObject({ status: 'page', kind: 'hire', path: '/hire/proposal-photographer-dubai' })
    expect(await resolve('/guides/brief-a-wedding-photographer')).toMatchObject({ status: 'page', kind: 'guide', path: '/guides/brief-a-wedding-photographer' })
    expect(await resolve('/guides/category/weddings')).toMatchObject({ status: 'page', kind: 'guideCategory' })
    expect(await resolve('/terms')).toMatchObject({ status: 'page', kind: 'legal', params: { kind: 'terms', view: 'current' } })
    expect(await resolve('/terms/versions/1')).toMatchObject({ status: 'page', kind: 'legal', params: { kind: 'terms', view: 'version', version: '1' } })
    expect(await resolve('/creators')).toMatchObject({ status: 'page', kind: 'route', path: '/creators' })
  })

  it('MR-US5-S1 /ar sets the locale of the answer', async () => {
    expect(await resolve('/ar/kayfa-yamal')).toEqual({ status: 'page', kind: 'page', path: '/kayfa-yamal', locale: 'ar', params: { slug: 'kayfa-yamal' } })
    expect(await resolve('/', { 'accept-language': 'ar' })).toMatchObject({ status: 'page', kind: 'route', locale: 'ar' })
  })

  it('MR-US5-S2 a renamed page and the English address asked in Arabic answer the current path', async () => {
    expect(await resolve('/old-studios')).toMatchObject({ status: 'page', kind: 'page', path: '/studios' })
    expect(await resolve('/ar/how-it-works')).toMatchObject({ status: 'page', kind: 'page', path: '/kayfa-yamal', locale: 'ar' })
  })

  it('MR-US5-S3 a removed address is removed and an unknown one is notFound, both 200', async () => {
    expect(await resolve('/summer-offer')).toEqual({ status: 'removed', path: '/summer-offer', locale: 'en' })
    expect(await resolve('/never-was')).toEqual({ status: 'notFound', path: '/never-was', locale: 'en' })
    expect(await resolve('/ar/does-not/exist/here')).toEqual({ status: 'notFound', path: '/does-not/exist/here', locale: 'ar' })
    expect(await resolve('/guides/not-a-guide')).toMatchObject({ status: 'notFound' })
    expect(await resolve('/terms/versions/9')).toMatchObject({ status: 'notFound' })
  })

  it('MR-US5-S4 private places are answered without looking anything up', async () => {
    const find = vi.spyOn(world.payload, 'find')
    const findByID = vi.spyOn(world.payload, 'findByID')
    const count = vi.spyOn(world.payload, 'count')
    expect(await resolve('/q/B-NOPE1/abc')).toEqual({ status: 'page', kind: 'private', path: '/q/B-NOPE1/abc', locale: 'en', params: { ref: 'B-NOPE1', key: 'abc' } })
    expect(await resolve('/account/bookings/x')).toMatchObject({ status: 'page', kind: 'private' })
    expect(find).not.toHaveBeenCalled()
    expect(findByID).not.toHaveBeenCalled()
    expect(count).not.toHaveBeenCalled()
  })

  it('refuses a path that is not a site path with a 422 problem', async () => {
    for (const path of ['https://x', '//x', '/a/../b']) {
      const res = await call(path)
      expect(res.status, path).toBe(422)
      expect(problemV1.parse(await res.json()).code).toBe('api.errors.invalidInput')
    }
  })
})

describe('MR-US5-S1 resolve: creators, booking and specialties', () => {
  let world: CreatorWorld
  let code: string

  beforeAll(async () => {
    world = await creatorWorld()
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider, { displayName: 'Resolve Me', gender: 'man', specialties: [world.category] })
    await publish(world, profile.id)
    code = String(profile.code).toLowerCase()
  })

  it('a published creator, their booking page and a specialty are page answers', async () => {
    expect(await resolve(`/creators/${code}`)).toEqual({ status: 'page', kind: 'creator', path: `/creators/${code}`, locale: 'en', params: { code } })
    expect(await resolve(`/book/${code.toUpperCase()}`)).toEqual({ status: 'page', kind: 'book', path: `/book/${code}`, locale: 'en', params: { code } })
    expect(await resolve('/work/portrait')).toMatchObject({ status: 'page', kind: 'specialty', path: '/work/portrait' })
  })

  it('an unknown creator and specialty are notFound', async () => {
    expect(await resolve('/creators/9999')).toMatchObject({ status: 'notFound', path: '/creators/9999' })
    expect(await resolve('/work/nothing-here')).toMatchObject({ status: 'notFound' })
  })
})
