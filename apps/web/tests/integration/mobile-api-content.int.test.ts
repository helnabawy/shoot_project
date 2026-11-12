import { articleV1, guideListV1, legalDocumentV1, legalVersionsV1, legalVersionV1, pageV1, problemV1, type BlockV1 } from '@shoot/domain/api/v1'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { GET as guideRoute } from '@/app/(payload)/api/mobile/v1/guides/[slug]/route'
import { GET as guidesRoute } from '@/app/(payload)/api/mobile/v1/guides/route'
import { GET as legalRoute } from '@/app/(payload)/api/mobile/v1/legal/[kind]/route'
import { GET as legalVersionRoute } from '@/app/(payload)/api/mobile/v1/legal/[kind]/versions/[version]/route'
import { GET as legalVersionsRoute } from '@/app/(payload)/api/mobile/v1/legal/[kind]/versions/route'
import { GET as pageRoute } from '@/app/(payload)/api/mobile/v1/pages/[slug]/route'
import type { RouteHandler } from '@/shared/api/handler'
import { createGuide, createLegal, createPage, guidesWorld, lexical, NOW, section, translateGuide, translatePage, version, type GuidesWorld } from './setup/pages'
import { quiet } from './setup/payload'

function call(handler: RouteHandler, path: string, params: Record<string, string> = {}, headers: Record<string, string> = {}) {
  return handler(new Request(`http://test/api/mobile/v1/${path}`, { headers }), { params: Promise.resolve(params) })
}

async function read<S extends z.ZodType>(handler: RouteHandler, path: string, schema: S, params: Record<string, string> = {}, headers: Record<string, string> = {}): Promise<z.output<S>> {
  const res = await call(handler, path, params, headers)
  expect(res.status, path).toBe(200)
  return schema.parse(await res.json())
}

async function status(handler: RouteHandler, path: string, params: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const res = await call(handler, path, params, headers)
  if (res.status !== 200) problemV1.parse(await res.json())
  return res.status
}

const ar = { 'accept-language': 'ar' }
const text = (t: string) => ({ type: 'text', text: t, version: 1, format: 0, detail: 0, mode: 'normal', style: '' })
const node = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({ type, version: 1, direction: 'ltr', format: '', indent: 0, children, ...extra })
const link = (url: string, label: string) => node('link', [text(label)], { fields: { linkType: 'custom', url, newTab: false } })

/** A guide body with every node kind: heading, list, quote, image and links (one unsafe). */
const richBody = (imageId: number) =>
  ({
    root: node('root', [
      node('heading', [text('Start with the day')], { tag: 'h2' }),
      node('list', [node('listitem', [text('The date')], { value: 1 }), node('listitem', [text('The places')], { value: 2 })], { listType: 'bullet', tag: 'ul', start: 1 }),
      node('quote', [text('Who will you look for in ten years?')]),
      { type: 'upload', version: 3, format: '', relationTo: 'media', value: imageId, fields: null },
      node('paragraph', [text('See '), link('/ar/creators', 'the creators'), text(' or '), link('javascript:alert(1)', 'this trick')]),
    ]),
  }) as never

/** Every block type anywhere in a rich text. */
const kinds = (nodes: readonly BlockV1[], into = new Set<string>()): Set<string> => {
  for (const n of nodes) {
    into.add(n.type)
    if (n.type === 'list') n.items.forEach((item) => kinds(item, into))
  }
  return into
}

describe('MR-US4 guides, pages and legal documents', () => {
  let world: GuidesWorld

  beforeAll(async () => {
    world = await guidesWorld()
    const wedding = await createGuide(world, { body: richBody(world.image.id) })
    await translateGuide(world, wedding.id, { title: 'كيف تكتب موجزًا لمصوّر حفل زفاف', summary: 'ماذا تقول قبل اليوم.', body: lexical('ابدأ بالتاريخ والمكان.') })
    await createGuide(world, { slug: 'corporate-headshots', title: 'Corporate headshots', categories: [world.categories.corporate.id], publishedAt: '2026-10-05T00:00:00.000Z' })
    await createGuide(world, { slug: 'untranslated', title: 'Only in English', publishedAt: '2026-09-01T00:00:00.000Z' })
    // Live one hour after the injected clock.
    await createGuide(world, { slug: 'scheduled', title: 'Scheduled guide', publishedAt: new Date(NOW.getTime() + 3_600_000).toISOString() })
    const other = await world.payload.create({ collection: 'authors', data: { slug: 'omar', name: 'Omar Ali' } as never, user: world.editor, overrideAccess: false, context: quiet })
    await createGuide(world, { slug: 'by-omar', title: 'By Omar', author: other.id, publishedAt: '2026-08-01T00:00:00.000Z' })

    const how = await createPage(world, { title: 'How it works', slug: 'how-it-works', sections: [section('steps', 'Brief, match, shoot.')] })
    await translatePage(world, how.id, { title: 'كيف يعمل', slug: 'kayfa-yamal' })
    const renamed = await createPage(world, { title: 'Studios', slug: 'old-studios' })
    await world.payload.update({ collection: 'pages', id: renamed.id, data: { slug: 'studios', _status: 'published' } as never, draft: false, user: world.editor, overrideAccess: false, context: quiet })
    await createPage(world, { title: 'Secret', slug: 'secret', _status: 'draft' })

    await createLegal(world, 'terms', [version('First terms', { changeSummary: 'The first terms' }), version('Second terms', { effectiveFrom: '2026-06-01T00:00:00.000Z', changeSummary: 'Clearer words' })])
  })

  // The clock the handler injects (`ctx.now()`) is fixed at NOW; only Date is faked, so I/O runs as usual.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('MR-US4-S1 the guides list', () => {
    it('lists live guides newest first with pagination', async () => {
      const list = await read(guidesRoute, 'guides', guideListV1)
      expect(list.items.map((i) => i.slug)).toEqual(['corporate-headshots', 'brief-a-wedding-photographer', 'untranslated', 'by-omar'])
      expect(list.pagination).toEqual({ page: 1, pageCount: 1, total: 4, pageSize: 12 })
      expect(list.category).toBeNull()
      expect(list.author).toBeNull()
      expect(list.categories.map((c) => c.slug).sort()).toEqual(['corporate', 'weddings'])
      expect(list.items[1]?.cover?.sizes.length).toBeGreaterThan(0)
    })

    it('?category= and ?author= narrow the list and fill category and author', async () => {
      const byCategory = await read(guidesRoute, 'guides?category=corporate', guideListV1)
      expect(byCategory.items.map((i) => i.slug)).toEqual(['corporate-headshots'])
      expect(byCategory.category).toMatchObject({ slug: 'corporate', name: 'Corporate' })

      const byAuthor = await read(guidesRoute, 'guides?author=omar', guideListV1)
      expect(byAuthor.items.map((i) => i.slug)).toEqual(['by-omar'])
      expect(byAuthor.author).toMatchObject({ slug: 'omar', name: 'Omar Ali' })
    })

    it('an unknown category or author gives 404', async () => {
      expect(await status(guidesRoute, 'guides?category=nope')).toBe(404)
      expect(await status(guidesRoute, 'guides?author=nobody')).toBe(404)
    })

    it('a page past the end answers the last page; page 0 is a 422', async () => {
      expect((await read(guidesRoute, 'guides?page=9', guideListV1)).pagination.page).toBe(1)
      expect(await status(guidesRoute, 'guides?page=0')).toBe(422)
    })

    it('a guide scheduled one hour after the injected clock is absent, then present once the clock passes it', async () => {
      expect((await read(guidesRoute, 'guides', guideListV1)).items.map((i) => i.slug)).not.toContain('scheduled')
      expect(await status(guideRoute, 'guides/scheduled', { slug: 'scheduled' })).toBe(404)

      vi.setSystemTime(new Date(NOW.getTime() + 2 * 3_600_000))
      expect((await read(guidesRoute, 'guides', guideListV1)).items[0]?.slug).toBe('scheduled')
      expect((await read(guideRoute, 'guides/scheduled', articleV1, { slug: 'scheduled' })).title).toBe('Scheduled guide')
    })
  })

  describe('MR-US4-S2 one guide', () => {
    it('returns the body with a heading, a list, a quote and an image; site links without /ar; the javascript: link as text', async () => {
      const guide = await read(guideRoute, 'guides/brief-a-wedding-photographer', articleV1, { slug: 'brief-a-wedding-photographer' })
      expect(guide.title).toBe('How to brief a wedding photographer')
      expect([...kinds(guide.body.nodes)]).toEqual(expect.arrayContaining(['heading', 'list', 'quote', 'image', 'paragraph']))
      const paragraph = guide.body.nodes.find((n) => n.type === 'paragraph')
      expect(paragraph).toMatchObject({ type: 'paragraph' })
      const children = paragraph && paragraph.type === 'paragraph' ? paragraph.children : []
      expect(children.filter((c) => c.type === 'link')).toEqual([expect.objectContaining({ href: '/creators' })])
      expect(children).toContainEqual(expect.objectContaining({ type: 'text', text: 'this trick' }))
      expect(JSON.stringify(guide)).not.toContain('javascript:')
      expect(guide.readingMinutes).toBeGreaterThanOrEqual(1)
    })

    it('an unknown or draft guide gives 404', async () => {
      expect(await status(guideRoute, 'guides/nope', { slug: 'nope' })).toBe(404)
    })
  })

  describe('MR-US4-S3 a guide not yet in Arabic', () => {
    it('returns the English text with inRequestedLanguage false, and a translated one true', async () => {
      const untranslated = await read(guideRoute, 'guides/untranslated', articleV1, { slug: 'untranslated' }, ar)
      expect(untranslated).toMatchObject({ title: 'Only in English', inRequestedLanguage: false })
      const translated = await read(guideRoute, 'guides/brief-a-wedding-photographer', articleV1, { slug: 'brief-a-wedding-photographer' }, ar)
      expect(translated).toMatchObject({ title: 'كيف تكتب موجزًا لمصوّر حفل زفاف', inRequestedLanguage: true })
      const list = await read(guidesRoute, 'guides', guideListV1, {}, ar)
      expect(list.locale).toBe('ar')
      expect(list.items.find((i) => i.slug === 'untranslated')?.inRequestedLanguage).toBe(false)
    })
  })

  describe('MR-US4-S4 editor pages', () => {
    it('works by the English and by the Arabic slug, answering each language its own path', async () => {
      const en = await read(pageRoute, 'pages/how-it-works', pageV1, { slug: 'how-it-works' })
      expect(en).toMatchObject({ locale: 'en', path: '/how-it-works', title: 'How it works' })
      expect(en.sections[0]).toMatchObject({ type: 'richText', anchor: 'steps' })

      const arabic = await read(pageRoute, 'pages/kayfa-yamal', pageV1, { slug: 'kayfa-yamal' }, ar)
      expect(arabic).toMatchObject({ locale: 'ar', path: '/kayfa-yamal', title: 'كيف يعمل' })
      // The English address read in Arabic answers the Arabic address.
      expect((await read(pageRoute, 'pages/how-it-works', pageV1, { slug: 'how-it-works' }, ar)).path).toBe('/kayfa-yamal')
    })

    it('a draft-only or unknown page gives 404', async () => {
      expect(await status(pageRoute, 'pages/secret', { slug: 'secret' })).toBe(404)
      expect(await status(pageRoute, 'pages/nope', { slug: 'nope' })).toBe(404)
    })

    it('an earlier slug answers with the current path', async () => {
      expect(await read(pageRoute, 'pages/old-studios', pageV1, { slug: 'old-studios' })).toMatchObject({ path: '/studios', title: 'Studios' })
    })
  })

  describe('MR-US4-S5 legal documents', () => {
    it('legal/terms returns version 2', async () => {
      const terms = await read(legalRoute, 'legal/terms', legalDocumentV1, { kind: 'terms' })
      expect(terms).toMatchObject({ kind: 'terms', version: 2, until: null, upcoming: null })
      expect(JSON.stringify(terms.body)).toContain('Second terms')
    })

    it('legal/terms/versions lists both with dates and change summaries', async () => {
      const list = await read(legalVersionsRoute, 'legal/terms/versions', legalVersionsV1, { kind: 'terms' })
      expect(list.versions).toEqual([
        { version: 2, from: '2026-06-01T00:00:00.000Z', until: null, changeSummary: 'Clearer words' },
        { version: 1, from: '2026-01-01T00:00:00.000Z', until: '2026-06-01T00:00:00.000Z', changeSummary: 'The first terms' },
      ])
    })

    it('legal/terms/versions/1 returns version 1; versions/3 gives 404', async () => {
      const first = await read(legalVersionRoute, 'legal/terms/versions/1', legalVersionV1, { kind: 'terms', version: '1' })
      expect(first).toMatchObject({ version: 1, until: '2026-06-01T00:00:00.000Z' })
      expect(JSON.stringify(first.body)).toContain('First terms')
      expect(await status(legalVersionRoute, 'legal/terms/versions/3', { kind: 'terms', version: '3' })).toBe(404)
    })

    it('a document without versions gives 404; an unknown kind or version 0 is a 422', async () => {
      expect(await status(legalRoute, 'legal/privacy', { kind: 'privacy' })).toBe(404)
      expect(await status(legalVersionsRoute, 'legal/privacy/versions', { kind: 'privacy' })).toBe(404)
      expect(await status(legalRoute, 'legal/cookies', { kind: 'cookies' })).toBe(422)
      expect(await status(legalVersionRoute, 'legal/terms/versions/0', { kind: 'terms', version: '0' })).toBe(422)
    })
  })
})
