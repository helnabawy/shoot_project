import { briefBuilderV1, landingV1, navigationV1, personasV1, problemV1, siteV1 } from '@shoot/domain/api/v1'
import { beforeAll, describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { GET as briefBuilder } from '@/app/(payload)/api/mobile/v1/brief-builder/route'
import { GET as landing } from '@/app/(payload)/api/mobile/v1/landing/route'
import { GET as navigation } from '@/app/(payload)/api/mobile/v1/navigation/route'
import { GET as personas } from '@/app/(payload)/api/mobile/v1/personas/route'
import { GET as site } from '@/app/(payload)/api/mobile/v1/site/route'
import type { RouteHandler } from '@/shared/api/handler'
import { seed } from '@/shared/payload/seed/seed'
import { getTestPayload, quiet, resetDatabase } from './setup/payload'

function call(handler: RouteHandler, path: string, headers: Record<string, string> = {}) {
  return handler(new Request(`http://test/api/mobile/v1/${path}`, { headers }), { params: Promise.resolve({}) })
}

async function read<S extends z.ZodType>(handler: RouteHandler, path: string, schema: S, headers: Record<string, string> = {}): Promise<z.output<S>> {
  const res = await call(handler, path, headers)
  expect(res.status, path).toBe(200)
  return schema.parse(await res.json())
}

const ar = { 'accept-language': 'ar' }
const ids = (refs: readonly (number | { id: number })[] | null | undefined) => (refs ?? []).map((p) => (typeof p === 'object' ? p.id : p))

/** Every key anywhere in a JSON value. */
function keysOf(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, into))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      into.add(k)
      keysOf(v, into)
    }
  return into
}

describe('MR-US1 the site words and settings', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  describe('MR-US1-S1 site', () => {
    it('returns the seeded WhatsApp details, publicly cached', async () => {
      const res = await call(site, 'site')
      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('public, s-maxage=60')
      const body = siteV1.parse(await res.json())
      expect(body.whatsapp).toEqual({ number: '+971500000000', defaultMessage: "Hi! I'd like to book a shoot.", expectedReplyTime: 'shortly' })
      expect(body.labels).toEqual({ seeker: 'I need a Photographer', provider: "I'm a Photographer" })
    })

    it('a changed number reaches the next answer', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'site-settings', data: { whatsappNumber: '+971501112233' }, context: quiet })
      try {
        expect((await read(site, 'site', siteV1)).whatsapp.number).toBe('+971501112233')
      } finally {
        await payload.updateGlobal({ slug: 'site-settings', data: { whatsappNumber: '+971500000000' }, context: quiet })
      }
    })
  })

  describe('MR-US1-S2 Arabic', () => {
    it('answers the seeded Arabic with Content-Language ar', async () => {
      const res = await call(site, 'site', ar)
      expect(res.headers.get('content-language')).toBe('ar')
      const body = siteV1.parse(await res.json())
      expect(body.locale).toBe('ar')
      expect(body.whatsapp.defaultMessage).toBe('مرحباً! أرغب في حجز جلسة تصوير.')
      expect(body.whatsapp.expectedReplyTime).toBe('قريباً')

      const nav = await read(navigation, 'navigation', navigationV1, ar)
      expect(nav.locale).toBe('ar')
      expect(nav.footerGroups.find((g) => g.key === 'company')?.label).toBe('الشركة')
      for (const link of [...nav.header, ...nav.legal, ...nav.footerGroups.flatMap((g) => g.links)]) expect(link.path).not.toMatch(/^\/ar(\/|$)/)

      const hero = (await read(landing, 'landing', landingV1, ar)).hero
      expect(hero.headline).toBe('أنت تحدّد. نحن نصوّر.')
    })

    it('a field cleared in Arabic returns its English text', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'site-settings', locale: 'ar', data: { expectedReplyTime: null }, context: quiet })
      try {
        expect((await read(site, 'site', siteV1, ar)).whatsapp.expectedReplyTime).toBe('shortly')
      } finally {
        await payload.updateGlobal({ slug: 'site-settings', locale: 'ar', data: { expectedReplyTime: 'قريباً' }, context: quiet })
      }
    })
  })

  describe('MR-US1-S3 ?locale=', () => {
    it('?locale=ar wins over Accept-Language en', async () => {
      const body = await read(site, 'site?locale=ar', siteV1, { 'accept-language': 'en' })
      expect(body.locale).toBe('ar')
      expect(body.whatsapp.expectedReplyTime).toBe('قريباً')
    })

    it('?locale=fr is 422', async () => {
      const res = await call(site, 'site?locale=fr')
      expect(res.status).toBe(422)
      const problem = problemV1.parse(await res.json())
      expect(problem.fields).toContainEqual({ path: 'query.locale', code: 'api.errors.localeUnsupported' })
    })
  })

  describe('MR-US1-S4 personas from the CMS', () => {
    it('a persona added to the active list appears in order with its categories; removed, it is gone everywhere', async () => {
      const payload = await getTestPayload()
      const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
      const before = ids(settings.activePersonas)
      const teacher = await payload.create({ collection: 'personas', data: { singular: 'Teacher', plural: 'Teachers', slug: 'teacher', glyph: 'T', order: 50 }, context: quiet })
      const tutoring = await payload.create({ collection: 'categories', data: { name: 'Tutoring', slug: 'tutoring', personas: [teacher.id], order: 50 }, context: quiet })

      // First in Site Settings order, even though its own order is later.
      await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [teacher.id, ...before] }, context: quiet })
      let body = await read(personas, 'personas', personasV1)
      expect(body.personas.map((p) => p.slug)).toEqual(['teacher', 'photographer', 'videographer'])
      expect(body.categories.find((c) => c.slug === 'tutoring')?.personaIds).toEqual([String(teacher.id)])
      expect((await read(site, 'site', siteV1)).labels.seeker).toBe('I need a Teacher')

      await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: before }, context: quiet })
      body = await read(personas, 'personas', personasV1)
      expect(body.personas.map((p) => p.slug)).toEqual(['photographer', 'videographer'])
      expect(body.categories.map((c) => c.slug)).not.toContain('tutoring')

      // No answer names a persona the CMS does not offer.
      const all = JSON.stringify(
        await Promise.all([
          read(site, 'site', siteV1),
          read(personas, 'personas', personasV1),
          read(briefBuilder, 'brief-builder', briefBuilderV1),
          read(landing, 'landing', landingV1),
        ]),
      )
      expect(all).not.toMatch(/teacher|tutoring/i)
      await payload.delete({ collection: 'categories', id: tutoring.id, context: quiet })
      await payload.delete({ collection: 'personas', id: teacher.id, context: quiet })
    })
  })

  describe('MR-US1-S5 brief builder and landing', () => {
    it('returns the seeded sentence and slots with options', async () => {
      const { builder } = await read(briefBuilder, 'brief-builder', briefBuilderV1)
      expect(builder?.sentence).toBe('I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.')
      expect(builder?.slots.map((s) => s.token)).toEqual(['persona', 'occasion', 'date', 'duration', 'location', 'shotBy'])
      expect(builder?.slots[0]?.options.map((o) => o.value)).toEqual(['photographer', 'videographer'])
      expect(builder?.slots.find((s) => s.token === 'location')?.options.map((o) => o.value)).toContain('dubai')
    })

    it('answers builder null when the builder is switched off', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'landing-page', data: { briefBuilder: { enabled: false }, _status: 'published' }, context: quiet })
      try {
        expect((await read(briefBuilder, 'brief-builder', briefBuilderV1)).builder).toBeNull()
      } finally {
        await payload.updateGlobal({ slug: 'landing-page', data: { briefBuilder: { enabled: true }, _status: 'published' }, context: quiet })
      }
    })

    it('returns the landing sections in CMS order, resolved', async () => {
      const payload = await getTestPayload()
      const stored = await payload.findGlobal({ slug: 'landing-page', depth: 0 })
      const body = await read(landing, 'landing', landingV1)
      expect(body.sections.map((s) => s.type)).toEqual((stored.sections ?? []).map((s) => s.blockType))
      expect(body.hero.headline).toBe('You brief. We shoot.')
      expect(body.navigation).toEqual([
        { label: 'How it works', target: 'how-it-works' },
        { label: 'Specialties', target: 'specialties' },
      ])
      const grid = body.sections.find((s) => s.type === 'categoriesGrid')
      expect(grid?.type === 'categoriesGrid' && grid.tiles.map((t) => t.category.slug)).toContain('portrait')
      const band = body.sections.find((s) => s.type === 'personaBand')
      expect(band?.type === 'personaBand' && band.heading).toBe('Are you a photographer or videographer?')
    })
  })

  describe('MR-US1-S6 nothing internal', () => {
    it('no answer carries an internal field', async () => {
      const bodies = [
        ...(await Promise.all([
          read(site, 'site', siteV1),
          read(navigation, 'navigation', navigationV1),
          read(personas, 'personas', personasV1),
          read(briefBuilder, 'brief-builder', briefBuilderV1),
          read(landing, 'landing', landingV1),
        ])),
        await read(landing, 'landing', landingV1, ar),
      ]
      const keys = keysOf(bodies)
      for (const name of ['accessSalt', 'matchValues', 'gender', 'briefLimitPerHour', 'autoPublishEdits', 'translationStatus', 'templates', 'channels', 'uploadedBy', 'publishedBy', 'previousSlugs', 'email', 'password', 'copy', 'seo']) {
        expect(keys.has(name), name).toBe(false)
      }
      const text = JSON.stringify(bodies)
      expect(text).not.toMatch(/briefLimitPerHour|autoPublishEdits|accessSalt|@test\.local/)
    })
  })
})
