import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import ar from '../../../messages/ar.json'
import en from '../../../messages/en.json'
import { defineHandler, problem } from '@/shared/api/handler'
import { wireContext } from '@/shared/api/wire'
import type { Locale } from '@/shared/lib/locale'
import { buildDirectory, type FilterKey } from './directory'
import { getCreatorProfile, getDirectoryContext, getPublicCreators, getSpecialtyPage } from './queries'
import { toWireCreatorList, toWireCreatorProfile, toWireSpecialtyPage } from './wire'

/** The directory's filter group names, the words the website's filter field shows. */
export function filterLabels(locale: Locale): Record<FilterKey, string> {
  const words = (locale === 'ar' ? ar : en).creators.directory
  return { type: words.professional, specialty: words.specialty, place: words.emirate }
}

/** `GET /api/mobile/v1/creators`: the website's directory, filters, counts and page (FR-025). */
export const getCreatorsV1 = defineHandler({
  ...endpoints.creators,
  run: async ({ locale }, { query }) => {
    const [creators, context] = await Promise.all([getPublicCreators(locale), getDirectoryContext(locale)])
    const view = buildDirectory({ creators, context, params: query, locale })
    return toWireCreatorList(view, context, filterLabels(locale), wireContext(locale))
  },
})

/** `GET /api/mobile/v1/creators/{code}`: a public profile by any spelling of its code (FR-026). */
export const getCreatorProfileV1 = defineHandler({
  ...endpoints.creatorProfile,
  run: async ({ locale }, { params }) => {
    const [page, context] = await Promise.all([getCreatorProfile(params.code, locale), getDirectoryContext(locale)])
    if (!page) return problem(404, 'api.errors.notFound')
    return toWireCreatorProfile(page, context.lookups, wireContext(locale))
  },
})

/** `GET /api/mobile/v1/work/{specialty}`: a specialty the audience offers (FR-027). */
export const getSpecialtyV1 = defineHandler({
  ...endpoints.specialty,
  run: async ({ locale }, { params }) => {
    const [page, context] = await Promise.all([getSpecialtyPage(params.specialty, locale), getDirectoryContext(locale)])
    if (!page) return problem(404, 'api.errors.notFound')
    return toWireSpecialtyPage(page, context, wireContext(locale))
  },
})
