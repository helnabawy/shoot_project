import { findUnknownPlaceholders, KNOWN_PLACEHOLDERS } from '@shoot/domain/content'
import { beforeAll, describe, expect, it } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { getTestPayload, resetDatabase } from './setup/payload'

const counts = async () => {
  const payload = await getTestPayload()
  const slugs = ['users', 'personas', 'categories', 'option-sets'] as const
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
    expect(first).toEqual({ users: 1, personas: 2, categories: 6, 'option-sets': 4 })
    const admin = await payload.find({ collection: 'users', limit: 1 })
    expect(admin.docs[0]?.roles).toEqual(['admin'])
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
