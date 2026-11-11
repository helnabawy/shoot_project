import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { getSectionContext } from '@/modules/landing'
import { defineHandler, problem } from '@/shared/api/handler'
import { getNavigation, getPageBySlug } from './queries'
import { toWireNavigation, toWirePage } from './wire'

/** `GET /api/mobile/v1/navigation`: header, footer groups and legal links (FR-021). */
export const getNavigationV1 = defineHandler({
  ...endpoints.navigation,
  run: async ({ locale }) => toWireNavigation(await getNavigation(locale), locale),
})

/**
 * `GET /api/mobile/v1/pages/{slug}`: a published standard page by its English or Arabic address, or
 * by an earlier one; `path` is always the current address in the answer's language (FR-028).
 */
export const getPageV1 = defineHandler({
  ...endpoints.page,
  run: async ({ locale, payload }, { params }) => {
    let result = await getPageBySlug(params.slug, locale, { kind: 'standard' })
    if (result?.status === 'redirect') result = await getPageBySlug(result.redirectTo.replace(/^\//, ''), locale, { kind: 'standard' })
    if (result?.status !== 'found') return problem(404, 'api.errors.notFound')
    const { page, slugs } = result
    return toWirePage(page, `/${slugs[locale]}`, await getSectionContext(locale, page.sections, payload))
  },
})
