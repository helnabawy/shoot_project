import type { CreatorCardV1 } from '@shoot/domain/api/v1'
import type { CreatorSummary } from '@shoot/domain/creators'
import { toWireImage, type WireContext } from '@/shared/api/wire'
import { describeCreator, type Lookups } from './describe'
import { languageName } from './profile'

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
