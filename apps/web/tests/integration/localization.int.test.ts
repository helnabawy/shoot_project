import { beforeAll, describe, expect, it } from 'vitest'
import { findUntranslatedFields } from '@/shared/payload/localization'
import { seed } from '@/shared/payload/seed/seed'
import { getTestPayload, quiet, resetDatabase } from './setup/payload'

describe('FR-037 / FR-038 localisation', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('stores Arabic separately and reads it back', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'landing-page', locale: 'ar', data: { hero: { headline: 'عنوان جديد' } }, context: quiet })
    const ar = await payload.findGlobal({ slug: 'landing-page', locale: 'ar' })
    const en = await payload.findGlobal({ slug: 'landing-page', locale: 'en' })
    expect(ar.hero?.headline).toBe('عنوان جديد')
    expect(en.hero?.headline).toBe('You brief. We shoot.')
  })

  it('falls back to English for an untranslated field and reports it', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'landing-page', locale: 'en', data: { hero: { eyebrow: 'New eyebrow' } }, context: quiet })
    await payload.updateGlobal({ slug: 'landing-page', locale: 'ar', data: { hero: { eyebrow: '' } }, context: quiet })
    const ar = await payload.findGlobal({ slug: 'landing-page', locale: 'ar', fallbackLocale: 'en' })
    expect(ar.hero?.eyebrow).toBe('New eyebrow')
    const all = await payload.findGlobal({ slug: 'landing-page', locale: 'all' })
    expect(findUntranslatedFields(all, 'ar')).toContain('hero.eyebrow')
  })

  it('shares slugs and numbers across languages', async () => {
    const payload = await getTestPayload()
    const en = await payload.find({ collection: 'option-sets', locale: 'en', sort: 'slug' })
    const ar = await payload.find({ collection: 'option-sets', locale: 'ar', sort: 'slug' })
    expect(ar.docs.map((d) => d.slug)).toEqual(en.docs.map((d) => d.slug))
    expect(ar.docs[0]!.options?.map((o) => o.value)).toEqual(en.docs[0]!.options?.map((o) => o.value))
    expect(ar.docs[0]!.options?.[0]?.label).not.toBe(en.docs[0]!.options?.[0]?.label)
  })

  it('FR-037 glyph tiles are localised: Arabic rows lead with Arabic letters', async () => {
    const payload = await getTestPayload()
    const find = (locale: 'en' | 'ar') => payload.find({ collection: 'option-sets', locale, where: { slug: { equals: 'locations' } } })
    const [en, ar] = await Promise.all([find('en'), find('ar')])
    expect(en.docs[0]!.options?.[0]?.glyph).toBe('DXB')
    expect(ar.docs[0]!.options?.[0]?.glyph).toBe('د')
    const persona = await payload.find({ collection: 'personas', locale: 'ar', where: { slug: { equals: 'photographer' } } })
    expect(persona.docs[0]!.glyph).toMatch(/\p{Script=Arabic}/u)
  })
})
