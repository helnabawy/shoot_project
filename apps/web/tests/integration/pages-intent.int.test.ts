import { similarIntents } from '@shoot/domain/pages'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createUser } from './setup/payload'
import { createDraft, creatorWorld, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'
import { refused, section } from './setup/pages'

class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFound()
  },
  permanentRedirect: () => {
    throw new NotFound()
  },
}))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }), headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }))
vi.mock('next-intl/server', () => import('../setup/server-intl'))
vi.mock('@/i18n/navigation', () => ({ Link: () => null, redirect: () => { throw new NotFound() }, usePathname: () => '/', useRouter: () => ({}), getPathname: () => '/' }))

const { seedDemoGuides } = await import('@/shared/payload/seed/demo-guides')
const { getIntentPage } = await import('@/modules/pages/intent')
const { getPageBySlug } = await import('@/modules/pages')
const route = await import('@/app/(site)/[locale]/hire/[slug]/page')
const standardRoute = await import('@/app/(site)/[locale]/[slug]/page')

const quiet = { disableRevalidate: true }
const props = (slug: string, locale = 'en') => ({ params: Promise.resolve({ locale, slug }) })

describe('MP-US4 intent pages', () => {
  let world: CreatorWorld
  let editor: Awaited<ReturnType<typeof createUser>>

  const create = (data: Record<string, unknown>) =>
    world.payload.create({
      collection: 'pages',
      data: { kind: 'intent', title: 'Intent', sections: [section()], _status: 'published', ...data } as never,
      draft: false,
      user: editor,
      overrideAccess: false,
      context: quiet,
    })
  const intent = (over: Record<string, unknown> = {}) => ({
    persona: world.personas.photographer,
    specialty: world.category,
    location: world.dubai,
    faq: [{ question: 'How soon?', answer: { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text: 'Within a day.', version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] }] } } }],
    ...over,
  })

  beforeAll(async () => {
    world = await creatorWorld()
    editor = await createUser(['editor'])
    await world.payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [world.personas.photographer, world.personas.videographer] } as never, context: quiet })
  }, 120_000)

  it('Honesty: the demo guides are refused on a non-local host and write nothing', async () => {
    await expect(seedDemoGuides(world.payload, { siteUrl: 'https://shoot.example', log: () => {} })).rejects.toThrow(/not a local or test host/)
    expect((await world.payload.count({ collection: 'articles' })).totalDocs).toBe(0)
    expect((await world.payload.count({ collection: 'pages', where: { kind: { equals: 'intent' } } })).totalDocs).toBe(0)
  })

  it('Honesty: the demo guides create guides, authors, categories and one intent page, once', async () => {
    await seedDemoGuides(world.payload, { siteUrl: 'http://localhost:3000', log: () => {} })
    await seedDemoGuides(world.payload, { siteUrl: 'http://localhost:3000', log: () => {} })
    expect((await world.payload.count({ collection: 'articles' })).totalDocs).toBe(30)
    expect((await world.payload.count({ collection: 'authors' })).totalDocs).toBe(2)
    expect((await world.payload.count({ collection: 'article-categories' })).totalDocs).toBe(3)
    expect((await world.payload.count({ collection: 'pages', where: { kind: { equals: 'intent' } } })).totalDocs).toBe(1)
    const future = await world.payload.count({ collection: 'articles', where: { publishedAt: { greater_than: new Date().toISOString() } }, overrideAccess: true })
    expect(future.totalDocs).toBe(3)
  })

  it('MP-US4-S1 opens with the answers the page is about, in the builder’s own terms, with the editor’s explicit answers', async () => {
    const result = await getIntentPage('proposal-photographer-dubai', 'en')
    if (result?.status !== 'found') throw new Error('expected the demo intent page')
    expect(result.preset).toEqual({ persona: 'photographer', location: 'dubai', occasion: 'event' })
    expect(result.dropped).toEqual([])
    expect(result.builder?.slots.map((s) => s.token)).toContain('occasion')
    expect(result.serviceName).toBe('Proposal photographer in Dubai')
    expect(result.areaServed).toBe('Dubai')
  })

  it('MP-US4-S3 carries FAQ and Service structured data, its own metadata and both languages as alternates', async () => {
    const element = (await route.default(props('proposal-photographer-dubai'))) as { props: { children: { props: Record<string, unknown> }[] } }
    const script = element.props.children[1]!.props.dangerouslySetInnerHTML as { __html: string }
    const blocks = JSON.parse(script.__html) as { '@type': string; mainEntity?: unknown[]; areaServed?: string; provider?: { name: string } }[]
    expect(blocks.map((b) => b['@type'])).toEqual(['FAQPage', 'Service'])
    expect(blocks[0]?.mainEntity).toHaveLength(2)
    expect(blocks[1]).toMatchObject({ areaServed: 'Dubai', provider: { name: 'Shoot Project' } })
    expect(script.__html).not.toContain('<')
    const meta = await route.generateMetadata(props('proposal-photographer-dubai'))
    expect(meta.title).toBe('Proposal photographer in Dubai')
    expect(meta.alternates).toMatchObject({ canonical: '/hire/proposal-photographer-dubai', languages: { en: '/hire/proposal-photographer-dubai', ar: '/ar/hire/proposal-photographer-dubai' } })
    expect((await route.generateMetadata(props('proposal-photographer-dubai', 'ar'))).title).toBe('مصور خطوبة في دبي')
  })

  it('MP-US4-S4 shows the creators that fit, up to six, and nothing when nobody does', async () => {
    const before = await getIntentPage('proposal-photographer-dubai', 'en')
    expect(before).toMatchObject({ creators: [], creatorTotal: 0 })
    const provider = await makeProvider(world)
    const photo = await uploadImage(world, provider)
    const profile = await createDraft(world, provider, { cities: [world.dubai], samples: [{ kind: 'image', image: photo.id, category: world.category }] })
    await publish(world, profile.id)
    const after = await getIntentPage('proposal-photographer-dubai', 'en')
    expect(after).toMatchObject({ creatorTotal: 1 })
    expect(after && after.status === 'found' && after.creators).toHaveLength(1)
    // a page for another kind of professional is not matched by this photographer
    await create({ title: 'Videographers in Dubai', slug: 'video-dubai', intent: intent({ persona: world.personas.videographer, specialty: undefined, faq: [] }) })
    expect(await getIntentPage('video-dubai', 'en')).toMatchObject({ creatorTotal: 0, creators: [] })
  })

  it('MP-US4-S2 the editor is told at save when the professional type is not offered, or a step does not exist', async () => {
    await refused(create({ title: 'Teachers', slug: 'teachers', intent: intent({ persona: world.personas.photographer, presets: [{ token: 'budget', value: '500' }] }) }), /steps the brief does not have/)
    await refused(create({ title: 'Nothing', slug: 'nothing', intent: { faq: [] } }), /Choose at least one/)
    await refused(create({ title: 'Half FAQ', slug: 'half-faq', intent: intent({ faq: [{ question: 'Only a question' }] }) }), /question needs both|Required|invalid/)
  })

  it('MP-US4-S2 and the page still works when the professional type is switched off later: the step is left open', async () => {
    await world.payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [world.personas.videographer] } as never, context: quiet })
    const result = await getIntentPage('proposal-photographer-dubai', 'en')
    if (result?.status !== 'found') throw new Error('expected the page to render')
    expect(result.preset).toEqual({ location: 'dubai', occasion: 'event' })
    expect(result.dropped).toEqual([{ token: 'persona', value: 'photographer', reason: 'inactivePersona' }])
    expect(result.builder).not.toBeNull()
    // and a new page for it cannot be published until it is switched on again
    await refused(create({ title: 'Photographers', slug: 'photographers-dubai', intent: intent() }), /not offered on the site/)
    await world.payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [world.personas.photographer, world.personas.videographer] } as never, context: quiet })
  })

  it('MP-US4-S5 finds the other pages about the same thing', async () => {
    await create({ title: 'Duplicate', slug: 'duplicate-proposal', intent: intent({ persona: world.personas.photographer, specialty: undefined, location: world.dubai, presets: [{ token: 'occasion', value: 'event' }], faq: [] }) })
    const { docs } = await world.payload.find({ collection: 'pages', where: { kind: { equals: 'intent' } }, depth: 0, draft: true, limit: 100, user: editor, overrideAccess: false })
    const demo = docs.find((d) => d.slug === 'proposal-photographer-dubai')!
    const copy = docs.find((d) => d.slug === 'duplicate-proposal')!
    // the demo page has no specialty; so does the copy, and they share persona, place and answers
    expect(similarIntents(docs, { personaId: String(world.personas.photographer), locationId: String(world.dubai), presets: [{ token: 'occasion', value: 'event' }] }, demo.id).map((d) => d.id)).toEqual([copy.id])
    expect(similarIntents(docs, { personaId: String(world.personas.videographer) }, null)).toEqual([])
  })

  it('MP-US4-S1 each kind is served only at its own address', async () => {
    expect(await getPageBySlug('proposal-photographer-dubai', 'en')).toBeNull()
    expect(await getIntentPage('studios', 'en')).toBeNull()
    await expect(route.default(props('studios'))).rejects.toBeInstanceOf(NotFound)
    await expect(standardRoute.default(props('proposal-photographer-dubai'))).rejects.toBeInstanceOf(NotFound)
  })

  it('MP-US4-S6 specialty pages and intent pages are in the sitemap once each', async () => {
    vi.resetModules()
    const sitemap = (await import('@/app/sitemap')).default
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.filter((u) => u.endsWith('/hire/proposal-photographer-dubai'))).toHaveLength(1)
    expect(urls.filter((u) => u.endsWith('/work/portrait'))).toHaveLength(1)
    // the seeded Studios page has a different Arabic address; it is listed once, under its English address
    expect(urls.filter((u) => u.endsWith('/studios'))).toHaveLength(1)
  })
})
