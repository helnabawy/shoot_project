import type { CreatorCardV1, CreatorListV1, CreatorProfileV1, ImageV1, SampleV1, SpecialtyPageV1 } from '@shoot/domain/api/v1'
import type { CreatorSummary } from '@shoot/domain/creators'
import { toWireImage, type WireContext } from '@/shared/api/wire'
import { describeCreator, type Lookups } from './describe'
import type { DirectoryView, FilterKey } from './directory'
import { languageName, sampleView } from './profile'
import type { CreatorProfilePage, DirectoryContext, SpecialtyPage } from './queries'

const names = (ids: readonly string[], map: ReadonlyMap<string, string>) =>
  ids.map((id) => map.get(id)).filter((n): n is string => Boolean(n))

/**
 * One creator card (008 data-model.md "Creators"): the website row's words, with the places,
 * specialties and languages as name lists. Gender and match values stay behind.
 */
export function toWireCreatorCard(c: CreatorSummary, lookups: Lookups, prefix: string, ctx: WireContext): CreatorCardV1 {
  const view = describeCreator(c, lookups, prefix, ctx.locale)
  return {
    code: c.code,
    displayCode: view.displayCode,
    name: view.name,
    initials: view.initials,
    photo: toWireImage(c.photo, ctx.base),
    types: view.types,
    places: names(c.locationIds, lookups.locations),
    specialties: names(c.specialtyIds, lookups.specialties),
    languages: c.languages.map((code) => languageName(code, ctx.locale)),
    yearsExperience: typeof c.yearsExperience === 'number' && c.yearsExperience >= 0 ? Math.floor(c.yearsExperience) : null,
    sampleCount: c.sampleCount,
    featured: c.featured,
  }
}

/** The widest size a grid picture needs (the media `card` size). */
export const THUMB_MAX_WIDTH = 800

/** The sizes up to `maxWidth`; the smallest one when every size is wider. */
export function upTo(image: ImageV1, maxWidth: number): ImageV1 {
  const fitting = image.sizes.filter((s) => s.width <= maxWidth)
  return { ...image, sizes: fitting.length > 0 ? fitting : image.sizes.slice(0, 1) }
}

/** The directory as `buildDirectory` computed it: the Top Hit leads page 1, then the rows. */
export function toWireCreatorList(view: DirectoryView, context: DirectoryContext, labels: Record<FilterKey, string>, ctx: WireContext): CreatorListV1 {
  const items = view.topHit ? [view.topHit, ...view.rows] : view.rows
  return {
    locale: ctx.locale,
    items: items.map((c) => toWireCreatorCard(c, context.lookups, context.prefix, ctx)),
    filters: view.groups.map((g) => ({
      key: g.key,
      label: labels[g.key],
      options: g.options.map((o) => ({ slug: o.slug, name: o.name, count: o.count, selected: o.selected })),
    })),
    pagination: { page: view.page, pageCount: view.total === 0 ? 0 : view.pages, total: view.total, pageSize: context.pageSize },
  }
}

/** A profile with every stored size of the photo and samples; samples the website drops are dropped too. */
export function toWireCreatorProfile(page: CreatorProfilePage, lookups: Lookups, ctx: WireContext): CreatorProfileV1 {
  const { view, doc } = page
  const samples: SampleV1[] = []
  for (const [i, raw] of (doc.samples ?? []).entries()) {
    const sample = sampleView(raw, i, lookups)
    const large = sample ? toWireImage(raw.image, ctx.base) : null
    if (!sample || !large) continue
    samples.push({
      id: sample.id,
      kind: sample.kind,
      thumb: upTo(large, THUMB_MAX_WIDTH),
      large,
      alt: sample.alt,
      caption: sample.caption,
      specialty: sample.specialty,
      videoUrl: sample.videoUrl ?? null,
      provider: sample.provider ?? null,
    })
  }
  return {
    locale: ctx.locale,
    code: view.code,
    displayCode: page.displayCode,
    name: view.name,
    initials: view.initials,
    bio: view.bio,
    photo: toWireImage(doc.photo, ctx.base),
    types: view.types,
    places: view.places,
    specialties: view.specialties,
    languages: view.languages,
    nationality: view.nationality || null,
    yearsExperience: typeof view.yearsExperience === 'number' && view.yearsExperience >= 0 ? Math.floor(view.yearsExperience) : null,
    samples,
    social: view.social.map((s) => ({ label: s.platform, url: s.url })),
    canBook: page.canBook,
    personaSlugs: [...page.personaSlugs],
  }
}

/** `/work/{slug}`: the editor's text, the real counts, the listed creators and the picked samples. */
export function toWireSpecialtyPage(page: SpecialtyPage, context: DirectoryContext, ctx: WireContext): SpecialtyPageV1 {
  return {
    locale: ctx.locale,
    category: { id: page.category.id, slug: page.category.slug, name: page.category.name },
    title: page.title,
    description: page.description,
    intro: page.intro,
    counts: { samples: page.counts.samples, professionals: page.counts.pros },
    creators: page.creators.map((c) => toWireCreatorCard(c, context.lookups, context.prefix, ctx)),
    samples: page.samples.flatMap((s) => {
      const image = toWireImage(s.media, ctx.base) ?? toWireImage({ ...s.thumb, alt: s.alt }, ctx.base)
      if (!image) return []
      return [{ id: s.id, creatorCode: s.code, creatorName: s.creatorName, thumb: upTo(image, THUMB_MAX_WIDTH), alt: s.alt, caption: s.caption, kind: s.kind }]
    }),
  }
}
