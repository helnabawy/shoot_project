import type { CollectionSlug, Payload } from 'payload'
import { briefSlots, categories, landingPage, locations, optionSets, personas, siteSettings } from './content'
import { demoPassword, seedDemoCreators } from './demo-creators'
import { seedDemoGuides } from './demo-guides'
import { seedLegalDocuments } from './legal'
import { seedStudiosPage } from './pages'
import { pickLocale, withRowIds } from './localize'
import { describeDemoCreators, occasionCategories, quickMatchSettings, seedDemoPrices, seedDemoQuickMatch } from './quick-match'

const context = { disableRevalidate: true }
type AnyDoc = Record<string, unknown> & { id: string | number }

async function upsertBySlug(payload: Payload, collection: CollectionSlug, slug: string, tree: object): Promise<AnyDoc> {
  const en = pickLocale(tree, 'en') as Record<string, unknown>
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, locale: 'en' })
  const existing = found.docs[0] as unknown as AnyDoc | undefined
  const saved = (
    existing
      ? await payload.update({ collection, id: existing.id, data: en, locale: 'en', depth: 0, context })
      : await payload.create({ collection, data: en, locale: 'en', depth: 0, context })
  ) as unknown as AnyDoc
  const ar = withRowIds(pickLocale(tree, 'ar'), saved) as Record<string, unknown>
  return (await payload.update({ collection, id: saved.id, data: ar, locale: "ar", depth: 0, context })) as unknown as AnyDoc
}

export interface SeedOptions {
  adminEmail?: string
  adminPassword?: string
  log?: (message: string) => void
  /** Local/e2e only: also create demo creators (refused on non-local hosts). */
  demoCreators?: boolean
  /** Local/e2e only: also create demo guides and an intent page (refused on non-local hosts). */
  demoGuides?: boolean
  siteUrl?: string
  demoPassword?: string
}

/** Idempotent: running it twice leaves the same documents (FR-032). */
export async function seed(payload: Payload, options: SeedOptions = {}): Promise<void> {
  const log = options.log ?? ((m: string) => payload.logger.info(`[seed] ${m}`))

  const users = await payload.count({ collection: 'users' })
  if (users.totalDocs === 0) {
    if (!options.adminEmail || !options.adminPassword) {
      log('No users and no SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD: skipping the first admin.')
    } else {
      await payload.create({
        collection: 'users',
        data: { name: 'Site admin', email: options.adminEmail, password: options.adminPassword, roles: ['admin'], accountType: 'seeker' },
        context,
      })
      log(`Created admin ${options.adminEmail}`)
    }
  }

  const personaIds: Record<string, string | number> = {}
  for (const persona of personas) {
    const doc = await upsertBySlug(payload, 'personas', persona.slug, { ...persona, active: true })
    personaIds[persona.slug] = doc.id
  }
  log(`Personas: ${Object.keys(personaIds).join(', ')}`)

  const categoryIds: Record<string, string | number> = {}
  for (const category of categories) {
    categoryIds[category.slug] = (await upsertBySlug(payload, 'categories', category.slug, {
      ...category,
      active: true,
      personas: category.personas.map((slug) => personaIds[slug]),
    })).id
  }
  log(`Categories: ${categories.length}`)

  for (const emirate of locations) {
    const parent = await upsertBySlug(payload, 'locations', emirate.slug, { slug: emirate.slug, name: emirate.name, order: emirate.order * 10, active: true })
    for (const [index, city] of emirate.cities.entries()) {
      await upsertBySlug(payload, 'locations', city.slug, { ...city, order: (index + 1) * 10, active: true, parent: parent.id })
    }
  }
  log(`Locations: ${locations.length} emirates`)

  const optionSetIds: Record<string, string | number> = {}
  for (const set of optionSets) {
    const doc = await upsertBySlug(payload, 'option-sets', set.slug, {
      ...set,
      options: set.options.map((o, index) => ({
        ...o,
        order: (index + 1) * 10,
        active: true,
        personas: [],
        // Quick Match (research §5): "anyone" means no preference; occasions rank matching specialists first.
        matchesAny: set.slug === 'shot-by' && o.value === 'anyone',
        category: set.slug === 'occasions' && occasionCategories[o.value] ? categoryIds[occasionCategories[o.value]!] : null,
      })),
    })
    optionSetIds[set.slug] = doc.id
  }
  log(`Option sets: ${Object.keys(optionSetIds).join(', ')}`)

  const settingsTree = { ...siteSettings, activePersonas: personas.map((p) => personaIds[p.slug]), quickMatch: quickMatchSettings }
  const settingsEn = await payload.updateGlobal({
    slug: 'site-settings',
    data: pickLocale(settingsTree, 'en') as never,
    locale: 'en',
    depth: 0,
    context,
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: withRowIds(pickLocale(settingsTree, 'ar'), settingsEn) as never,
    locale: 'ar',
    depth: 0,
    context,
  })
  log('Site settings')

  const landingTree = {
    ...landingPage,
    briefBuilder: {
      ...landingPage.briefBuilder,
      slots: briefSlots.map((slot) => ({ ...slot, optionSet: 'optionSet' in slot ? optionSetIds[slot.optionSet] : undefined, filtersCreators: slot.token === 'shotBy' })),
    },
    _status: 'published',
  }
  const landingEn = await payload.updateGlobal({
    slug: 'landing-page',
    data: pickLocale(landingTree, 'en') as never,
    locale: 'en',
    depth: 0,
    draft: false,
    context,
  })
  await payload.updateGlobal({
    slug: 'landing-page',
    data: withRowIds(pickLocale(landingTree, 'ar'), landingEn) as never,
    locale: 'ar',
    depth: 0,
    draft: false,
    context,
  })
  log('Landing page published')

  await seedStudiosPage(payload, log)
  await seedLegalDocuments(payload, { siteUrl: options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL, log })

  if (options.demoCreators) {
    await seedDemoCreators(payload, { siteUrl: options.siteUrl, password: demoPassword(options.demoPassword), log })
    await describeDemoCreators(payload, log)
    await seedDemoPrices(payload, log)
    await seedDemoQuickMatch(payload, log)
  }

  if (options.demoGuides) {
    await seedDemoGuides(payload, { siteUrl: options.siteUrl, log })
  }
}
