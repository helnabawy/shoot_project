import { gzipSync } from 'node:zlib'
import { creatorListV1, creatorProfileV1, hirePageV1, problemV1, specialtyPageV1 } from '@shoot/domain/api/v1'
import { beforeAll, describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { GET as profileRoute } from '@/app/(payload)/api/mobile/v1/creators/[code]/route'
import { GET as directoryRoute } from '@/app/(payload)/api/mobile/v1/creators/route'
import { GET as hireRoute } from '@/app/(payload)/api/mobile/v1/hire/[slug]/route'
import { GET as specialtyRoute } from '@/app/(payload)/api/mobile/v1/work/[specialty]/route'
import { buildDirectory, getDirectoryContext, getPublicCreators } from '@/modules/creators'
import type { RouteHandler } from '@/shared/api/handler'
import { createDraft, creatorWorld, listingOf, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'
import { createUser, quiet } from './setup/payload'
import { section } from './setup/pages'

/** MR-US3: the directory, profiles, specialty pages and hire pages, against the seeded database. */

function call(handler: RouteHandler, path: string, params: Record<string, string> = {}, headers: Record<string, string> = {}) {
  return handler(new Request(`http://test/api/mobile/v1/${path}`, { headers }), { params: Promise.resolve(params) })
}

async function read<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBe(200)
  return schema.parse(await res.json())
}

async function expectNotFound(res: Promise<Response>) {
  const answer = await res
  expect(answer.status).toBe(404)
  expect(answer.headers.get('content-type')).toContain('application/problem+json')
  expect(problemV1.parse(await answer.json()).code).toBe('api.errors.notFound')
}

const directory = (query = '') => call(directoryRoute, `creators${query}`)
const codesOf = (list: z.output<typeof creatorListV1>) => list.items.map((c) => c.name)

describe('MR-US3 creators in the app', () => {
  let world: CreatorWorld
  let editor: Awaited<ReturnType<typeof createUser>>
  const codes: Record<string, string> = {}
  const ids: Record<string, number> = {}

  const make = async (name: string, over: Record<string, unknown> = {}, publishIt = true, withSample = true) => {
    const provider = await makeProvider(world, (over.personas as number[] | undefined)?.[0])
    const image = withSample ? await uploadImage(world, provider, `${name}.png`, `${name} at work`) : null
    const samples = image ? [{ kind: 'image', image: image.id, category: world.category, caption: `${name} sample` }] : []
    const profile = await createDraft(world, provider, { displayName: name, gender: 'man', samples, ...over })
    if (publishIt) await publish(world, profile.id)
    codes[name] = profile.code as string
    ids[name] = profile.id
  }
  const setListing = async (name: string, data: Record<string, unknown>) =>
    world.payload.update({ collection: 'creator-listings', id: (await listingOf(world, ids[name]!))!.id, data, overrideAccess: true, context: quiet })

  beforeAll(async () => {
    world = await creatorWorld()
    editor = await createUser(['editor'])
    await world.payload.updateGlobal({ slug: 'site-settings', data: { directoryPageSize: 6 } as never, context: quiet })
    // Older listed creators in Al Ain with events only, so the directory has a second page (6 per page).
    for (const n of [1, 2, 3, 4]) await make(`Filler ${n}`, { cities: [world.city], specialties: [world.otherCategory] }, true, false)
    await make('Alma Featured')
    await make('Basma Dubai', { cities: [world.dubai] })
    await make('Cyrus Abu Dhabi', { cities: [world.abuDhabi], specialties: [world.category, world.otherCategory] })
    await make('Vera Videographer', { personas: [world.personas.videographer] })
    await make('Sami Suspended')
    await make('Dana Draft', {}, false)
    await setListing('Alma Featured', { featured: true })
    await setListing('Sami Suspended', { suspended: true })
    // Then only photographers stay in the audience: the videographer is reachable, not listed.
    await world.payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [world.personas.photographer] } as never, context: quiet })
  }, 180_000)

  describe('MR-US3-S1 the directory', () => {
    it('lists only listed creators, featured first, then newest, publicly cached', async () => {
      const res = await directory()
      expect(res.headers.get('cache-control')).toBe('public, s-maxage=60')
      const list = await read(res, creatorListV1)
      expect(codesOf(list)).toEqual(['Alma Featured', 'Cyrus Abu Dhabi', 'Basma Dubai', 'Filler 4', 'Filler 3', 'Filler 2'])
      expect(list.pagination).toEqual({ page: 1, pageCount: 2, total: 7, pageSize: 6 })
      const page2 = await read(await directory('?page=2'), creatorListV1)
      expect(codesOf(page2)).toEqual(['Filler 1'])
      expect(JSON.stringify([list, page2])).not.toMatch(/Vera|Sami|Dana|"gender"|matchValues/)
    })

    it('?page=99 answers the last page with its real number', async () => {
      const list = await read(await directory('?page=99'), creatorListV1)
      expect(list.pagination.page).toBe(2)
      expect(codesOf(list)).toEqual(['Filler 1'])
    })

    it('?specialty=, ?place= narrow the list, and the filter counts match buildDirectory', async () => {
      const bySpecialty = await read(await directory('?specialty=events'), creatorListV1)
      expect(codesOf(bySpecialty)).toEqual(['Cyrus Abu Dhabi', 'Filler 4', 'Filler 3', 'Filler 2', 'Filler 1'])
      const byPlace = await read(await directory('?place=dubai'), creatorListV1)
      expect(codesOf(byPlace)).toEqual(['Alma Featured', 'Basma Dubai'])

      const [creators, context] = await Promise.all([getPublicCreators('en'), getDirectoryContext('en')])
      const view = buildDirectory({ creators, context, params: { place: 'dubai' }, locale: 'en' })
      expect(byPlace.filters.map((f) => ({ key: f.key, options: f.options }))).toEqual(
        view.groups.map((g) => ({ key: g.key, options: g.options.map((o) => ({ slug: o.slug, name: o.name, count: o.count, selected: o.selected })) })),
      )
      expect(byPlace.filters.find((f) => f.key === 'place')?.options.find((o) => o.slug === 'dubai')).toMatchObject({ selected: true, count: 2 })
      expect(byPlace.filters.map((f) => f.label)).toEqual(['Specialty', 'Emirate'])
    })

    it('?type= narrows to the offered type; an unknown slug is ignored, as on the website', async () => {
      expect((await read(await directory('?type=photographer'), creatorListV1)).pagination.total).toBe(7)
      // Videographers are not in the audience, so the slug is unknown here and ignored, like `nope`.
      expect((await read(await directory('?type=videographer&specialty=nope'), creatorListV1)).pagination.total).toBe(7)
    })

    it('answers in Arabic with the Arabic filter names', async () => {
      const list = await read(await call(directoryRoute, 'creators', {}, { 'accept-language': 'ar' }), creatorListV1)
      expect(list.locale).toBe('ar')
      expect(list.filters.map((f) => f.label)).toEqual(['التخصص', 'الإمارة'])
    })

    it('a malformed page is a 422 problem', async () => {
      const res = await directory('?page=zero')
      expect(res.status).toBe(422)
      expect(problemV1.parse(await res.json()).fields).toEqual([{ path: 'query.page', code: 'api.errors.invalidField' }])
    })

    it('SC-006 page 1 is at most 100 KB gzipped', async () => {
      const body = await (await directory()).text()
      expect(gzipSync(body).length).toBeLessThanOrEqual(100 * 1024)
    })
  })

  describe('MR-US3-S2 a profile by code', () => {
    it('the lower-case code and an earlier prefix return the profile with the current prefix, and no gender', async () => {
      const code = codes['Basma Dubai']!
      const lower = await read(await call(profileRoute, `creators/${code.toLowerCase()}`, { code: code.toLowerCase() }), creatorProfileV1)
      expect(lower).toMatchObject({ code, name: 'Basma Dubai', canBook: true, personaSlugs: ['photographer'], places: ['Dubai'] })
      const prefix = (await world.payload.findGlobal({ slug: 'site-settings' })).creatorCodePrefix ?? 'CR'
      expect(lower.displayCode).toBe(`${prefix}-${code}`)
      const old = await read(await call(profileRoute, `creators/OLD-${code}`, { code: `OLD-${code}` }), creatorProfileV1)
      expect(old.displayCode).toBe(lower.displayCode)
      expect(old.samples).toHaveLength(1)
      expect(old.samples[0]).toMatchObject({ kind: 'image', caption: 'Basma Dubai sample', alt: 'Basma Dubai at work', videoUrl: null })
      expect(old.samples[0]?.large.sizes[0]?.url).toMatch(/^https?:\/\//)
      const raw = await (await call(profileRoute, `creators/${code}`, { code })).text()
      expect(raw).not.toMatch(/"gender"|matchValues|accessSalt/)
    })

    it('a reachable creator outside the audience answers with canBook false', async () => {
      const code = codes['Vera Videographer']!
      expect((await read(await call(profileRoute, `creators/${code}`, { code }), creatorProfileV1)).canBook).toBe(false)
    })

    it('unknown, unpublished and suspended codes are a 404 problem', async () => {
      await expectNotFound(call(profileRoute, 'creators/ZZZZZ', { code: 'ZZZZZ' }))
      await expectNotFound(call(profileRoute, `creators/${codes['Dana Draft']}`, { code: codes['Dana Draft']! }))
      await expectNotFound(call(profileRoute, `creators/${codes['Sami Suspended']}`, { code: codes['Sami Suspended']! }))
    })
  })

  describe('MR-US3-S3 a specialty page', () => {
    it('returns the text, counts, creators and samples', async () => {
      const page = await read(await call(specialtyRoute, 'work/portrait', { specialty: 'portrait' }), specialtyPageV1)
      expect(page.category.slug).toBe('portrait')
      expect(page.title).toBeTruthy()
      expect(page.creators.map((c) => c.name)).toEqual(['Alma Featured', 'Cyrus Abu Dhabi', 'Basma Dubai'])
      expect(page.counts).toEqual({ samples: 3, professionals: 3 })
      expect(page.samples.map((s) => s.creatorName).sort()).toEqual(['Alma Featured', 'Basma Dubai', 'Cyrus Abu Dhabi'])
      expect(page.samples.every((s) => Object.values(codes).includes(s.creatorCode))).toBe(true)
    })

    it('a specialty outside the audience, or unknown, is a 404 problem', async () => {
      const own = await world.payload.create({ collection: 'categories', data: { name: 'Lessons', slug: 'lessons', personas: [world.personas.videographer] } as never, context: quiet })
      expect(own.id).toBeTruthy()
      await expectNotFound(call(specialtyRoute, 'work/lessons', { specialty: 'lessons' }))
      await expectNotFound(call(specialtyRoute, 'work/nope', { specialty: 'nope' }))
    })
  })

  describe('MR-US3-S4 a hire page', () => {
    const lexical = (text: string) => ({
      root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] }] },
    })
    let pageId = 0

    beforeAll(async () => {
      const page = await world.payload.create({
        collection: 'pages',
        data: {
          kind: 'intent',
          title: 'Portrait photographer',
          slug: 'portrait-photographer',
          sections: [section('intro', 'Hello')],
          intent: { persona: world.personas.photographer, specialty: world.category, intro: 'Tell us the date.', faq: [{ question: 'How soon?', answer: lexical('Within a day.') }] },
          _status: 'published',
        } as never,
        draft: false,
        user: editor,
        overrideAccess: false,
        context: quiet,
      })
      pageId = page.id
      // The FAQ rows keep their ids, so the Arabic words join the English ones instead of replacing the rows.
      const faq = (page.intent?.faq ?? []).map((row) => ({ id: row.id, question: 'متى؟', answer: lexical('خلال يوم.') }))
      await world.payload.update({ collection: 'pages', id: pageId, locale: 'ar', data: { title: 'مصور بورتريه', slug: 'مصور-بورتريه', intent: { faq }, _status: 'published' } as never, user: editor, overrideAccess: false, context: quiet })
      await world.payload.create({
        collection: 'pages',
        data: { kind: 'intent', title: 'Draft', slug: 'draft-hire', sections: [section()], intent: { persona: world.personas.photographer, faq: [] }, _status: 'draft' } as never,
        draft: true,
        user: editor,
        overrideAccess: false,
        context: quiet,
      })
    })

    it('returns the intro, the builder with the preset, at most six creators, the total and the FAQ', async () => {
      const page = await read(await call(hireRoute, 'hire/portrait-photographer', { slug: 'portrait-photographer' }), hirePageV1)
      expect(page).toMatchObject({ path: '/hire/portrait-photographer', title: 'Portrait photographer', intro: 'Tell us the date.', creatorTotal: 3 })
      expect(page.builder?.slots.length).toBeGreaterThan(0)
      expect(page.preset.persona).toBe('photographer')
      expect(page.creators.map((c) => c.name).sort()).toEqual(['Alma Featured', 'Basma Dubai', 'Cyrus Abu Dhabi'])
      expect(page.creators.length).toBeLessThanOrEqual(6)
      expect(page.sections.map((s) => s.type)).toEqual(['richText'])
      expect(page.faq[0]?.question).toBe('How soon?')
      expect(page.faq[0]?.answer.nodes[0]).toMatchObject({ type: 'paragraph' })
    })

    it("the other language's slug and an earlier slug answer with the current path", async () => {
      const ar = await read(await call(hireRoute, 'hire/portrait-photographer', { slug: 'portrait-photographer' }, { 'accept-language': 'ar' }), hirePageV1)
      expect(ar.path).toBe('/hire/مصور-بورتريه')
      expect(ar.title).toBe('مصور بورتريه')
      const encoded = encodeURIComponent('مصور-بورتريه')
      expect((await read(await call(hireRoute, `hire/${encoded}`, { slug: encoded }, { 'accept-language': 'ar' }), hirePageV1)).path).toBe('/hire/مصور-بورتريه')

      await world.payload.update({ collection: 'pages', id: pageId, data: { slug: 'portrait-photographers' } as never, user: editor, overrideAccess: false, context: quiet })
      const renamed = await read(await call(hireRoute, 'hire/portrait-photographer', { slug: 'portrait-photographer' }), hirePageV1)
      expect(renamed.path).toBe('/hire/portrait-photographers')
    })

    it('a draft and an unknown slug are a 404 problem', async () => {
      await expectNotFound(call(hireRoute, 'hire/draft-hire', { slug: 'draft-hire' }))
      await expectNotFound(call(hireRoute, 'hire/nope', { slug: 'nope' }))
    })
  })
})
