import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { getDirectoryContext } from '@/modules/creators'
import { getSectionContext } from '@/modules/landing'
import { defineHandler, problem } from '@/shared/api/handler'
import { getIntentPage } from './intent'
import { getNavigation } from './queries'
import { toWireHirePage, toWireNavigation } from './wire'

/** `GET /api/mobile/v1/navigation`: header, footer groups and legal links (FR-021). */
export const getNavigationV1 = defineHandler({
  ...endpoints.navigation,
  run: async ({ locale }) => toWireNavigation(await getNavigation(locale), locale),
})

/** A slug as the route hands it: decoded when it arrives percent-encoded (Arabic addresses). */
function decoded(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

/**
 * `GET /api/mobile/v1/hire/{slug}`: an intent page by this language's slug, the other language's or
 * an earlier one. A renamed address answers 200 with the current `path`, never a redirect (FR-027).
 */
export const getHirePageV1 = defineHandler({
  ...endpoints.hirePage,
  run: async ({ locale, payload }, { params }) => {
    let found = await getIntentPage(decoded(params.slug), locale)
    // A redirect names the current address; follow it once (the website's permanent redirect).
    if (found?.status === 'redirect') found = await getIntentPage(found.redirectTo.replace(/^\/hire\//, ''), locale)
    if (!found || found.status !== 'found') return problem(404, 'api.errors.notFound')
    const [sections, directory] = await Promise.all([getSectionContext(locale, found.page.sections, payload), getDirectoryContext(locale)])
    return toWireHirePage(found, { ...sections, directory: { lookups: directory.lookups, prefix: directory.prefix } })
  },
})
