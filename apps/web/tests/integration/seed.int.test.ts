import { findUnknownPlaceholders, KNOWN_PLACEHOLDERS } from '@shoot/domain/content'
import { beforeAll, describe, expect, it } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { getTestPayload, resetDatabase } from './setup/payload'

const counts = async () => {
  const payload = await getTestPayload()
  const slugs = ['users', 'personas', 'categories', 'option-sets', 'pages'] as const
  return Object.fromEntries(await Promise.all(slugs.map(async (s) => [s, (await payload.count({ collection: s })).totalDocs])))
}

describe('FR-032 seed', () => {
  beforeAll(async () => {
    await resetDatabase()
  })

  it('is idempotent and creates exactly one admin', async () => {
    const payload = await getTestPayload()
    await seed(payload, { adminEmail: 'admin@test.local', adminPassword: 'password-123', log: () => {} })
    const first = await counts()
    await seed(payload, { adminEmail: 'admin@test.local', adminPassword: 'password-123', log: () => {} })
    expect(await counts()).toEqual(first)
    expect(first).toEqual({ users: 1, personas: 2, categories: 6, 'option-sets': 4, pages: 1 })
    const admin = await payload.find({ collection: 'users', limit: 1 })
    expect(admin.docs[0]?.roles).toEqual(['admin'])
  })

  it('MP-US1-S1 seeds the Studios page in both languages, in the footer, and leaves it alone once an editor owns it', async () => {
    const payload = await getTestPayload()
    const en = (await payload.find({ collection: 'pages', where: { slug: { equals: 'studios' } }, locale: 'en', depth: 0, limit: 1 })).docs[0]!
    expect(en).toMatchObject({ title: 'Studios', _status: 'published', placement: { footerGroup: 'company' } })
    const ar = await payload.findByID({ collection: 'pages', id: en.id, locale: 'ar', fallbackLocale: false, depth: 0 })
    expect(ar).toMatchObject({ title: 'الاستوديوهات', slug: 'استوديوهات' })
    await payload.update({ collection: 'pages', id: en.id, data: { title: 'Our studios', _status: 'published' } as never, draft: false, locale: 'en', context: { disableRevalidate: true } })
    await seed(payload, { log: () => {} })
    expect((await payload.findByID({ collection: 'pages', id: en.id, locale: 'en', depth: 0 })).title).toBe('Our studios')
    const settings = await payload.findGlobal({ slug: 'site-settings', locale: 'en' })
    expect(settings.footerGroups?.map((g) => g.key)).toEqual(['company'])
  })

  it('publishes the landing page in both languages with matching option counts', async () => {
    const payload = await getTestPayload()
    const en = await payload.findGlobal({ slug: 'landing-page', locale: 'en', depth: 1 })
    const ar = await payload.findGlobal({ slug: 'landing-page', locale: 'ar', depth: 1 })
    expect(en._status).toBe('published')
    expect(ar.hero?.headline).toBe('أنت تحدّد. نحن نصوّر.')
    expect(ar.sections?.length).toBe(en.sections?.length)
    const sets = await payload.find({ collection: 'option-sets', locale: 'ar' })
    const sizes = Object.fromEntries(sets.docs.map((d) => [d.slug, d.options?.length]))
    expect(sizes).toEqual({ occasions: 19, durations: 5, locations: 8, 'shot-by': 3 })
  })

  it('seed copy contains no unknown placeholders in either language', async () => {
    const payload = await getTestPayload()
    const known = [...KNOWN_PLACEHOLDERS, 'persona', 'occasion', 'date', 'duration', 'location', 'shotBy']
    for (const locale of ['en', 'ar'] as const) {
      const landing = await payload.findGlobal({ slug: 'landing-page', locale })
      const settings = await payload.findGlobal({ slug: 'site-settings', locale })
      const strings: string[] = []
      JSON.stringify([landing, settings], (_key, value) => {
        if (typeof value === 'string') strings.push(value)
        return value
      })
      expect(strings.flatMap((s) => findUnknownPlaceholders(s, known)), locale).toEqual([])
    }
  })
})

describe('002 seed: no invented proof', () => {
  beforeAll(async () => {
    await resetDatabase()
  })

  it('the default seed creates locations, the code prefix and the network block, but no creators or providers', async () => {
    const payload = await getTestPayload()
    await seed(payload, { adminEmail: 'admin@test.local', adminPassword: 'password-123', log: () => {} })
    await seed(payload, { adminEmail: 'admin@test.local', adminPassword: 'password-123', log: () => {} })
    expect((await payload.find({ collection: 'creator-profiles', draft: true, limit: 1, depth: 0 })).totalDocs).toBe(0)
    expect((await payload.count({ collection: 'creator-listings' })).totalDocs).toBe(0)
    expect((await payload.count({ collection: 'users', where: { accountType: { equals: 'provider' } } })).totalDocs).toBe(0)
    const locations = await payload.find({ collection: 'locations', limit: 100, depth: 0 })
    expect(locations.totalDocs).toBe(7 + 3 + 3 + 1)
    const alAin = locations.docs.find((l) => l.slug === 'al-ain')
    const abuDhabi = locations.docs.find((l) => l.slug === 'abu-dhabi')
    expect(alAin?.parent).toBe(abuDhabi?.id)
    expect((await payload.findGlobal({ slug: 'site-settings', depth: 0 })).creatorCodePrefix).toBe('CR')
    const landing = await payload.findGlobal({ slug: 'landing-page', locale: 'en', depth: 0 })
    expect(landing.sections?.some((s) => s.blockType === 'creatorNetwork')).toBe(true)
  })

  it('every emirate slug is a value of the brief builder’s locations option set (research §9)', async () => {
    const payload = await getTestPayload()
    const set = (await payload.find({ collection: 'option-sets', where: { slug: { equals: 'locations' } }, limit: 1, depth: 0 })).docs[0]!
    const values = new Set((set.options ?? []).map((o) => o.value))
    const emirates = (await payload.find({ collection: 'locations', where: { parent: { exists: false } }, limit: 100, depth: 0 })).docs
    expect(emirates).toHaveLength(7)
    for (const emirate of emirates) expect(values.has(emirate.slug), emirate.slug).toBe(true)
  })

  it('seeds specialty page text in both languages', async () => {
    const payload = await getTestPayload()
    const en = await payload.find({ collection: 'categories', locale: 'en', limit: 20, depth: 0 })
    const ar = await payload.find({ collection: 'categories', locale: 'ar', limit: 20, depth: 0 })
    for (const doc of en.docs) expect(doc.seo?.title && doc.seo.description && doc.seo.intro, doc.slug).toBeTruthy()
    for (const doc of ar.docs) expect(doc.seo?.title, doc.slug).toMatch(/[؀-ۿ]/)
  })

  it('the demo seed is refused on a non-local host and writes nothing', async () => {
    const payload = await getTestPayload()
    await expect(seed(payload, { log: () => {}, demoCreators: true, siteUrl: 'https://example.com' })).rejects.toThrow(/local or test host/)
    await expect(seed(payload, { log: () => {}, demoCreators: true, siteUrl: undefined })).rejects.toThrow(/local or test host/)
    expect((await payload.find({ collection: 'creator-profiles', draft: true, limit: 1, depth: 0 })).totalDocs).toBe(0)
  })

  it('the demo seed creates the listed creators, is idempotent and honours fixed codes', async () => {
    const payload = await getTestPayload()
    const options = { log: () => {}, demoCreators: true, siteUrl: 'http://localhost:3000', demoPassword: 'demo-password-1' }
    await seed(payload, options)
    await seed(payload, options)
    const profiles = await payload.find({ collection: 'creator-profiles', draft: true, limit: 50, depth: 0, sort: 'code' })
    expect(profiles.docs.map((p) => p.code)).toEqual(['D2222', 'D3333', 'D4444', 'D5555', 'D6666', 'D7777', 'D8888'])
    const published = await payload.find({ collection: 'creator-profiles', limit: 50, depth: 0, where: { _status: { equals: 'published' } } })
    expect(published.docs.map((p) => p.code).sort()).toEqual(['D2222', 'D3333', 'D4444', 'D6666', 'D7777', 'D8888'])
    const ar = await payload.findByID({ collection: 'creator-profiles', id: profiles.docs[0]!.id, locale: 'ar', depth: 0 })
    expect(ar.displayName).toMatch(/[؀-ۿ]/)
    const paused = await payload.find({ collection: 'creator-listings', where: { active: { equals: false } }, depth: 0 })
    expect(paused.totalDocs).toBe(1)
    const awaiting = await payload.find({ collection: 'creator-listings', where: { submittedAt: { exists: true } }, depth: 0 })
    expect(awaiting.totalDocs).toBe(1)
    const featured = await payload.find({ collection: 'creator-listings', where: { featured: { equals: true } }, depth: 0 })
    expect(featured.totalDocs).toBe(1)
  }, 120_000)
})
