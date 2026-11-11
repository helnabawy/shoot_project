import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { getNavigation } from './queries'
import { toWireNavigation } from './wire'

/** `GET /api/mobile/v1/navigation`: header, footer groups and legal links (FR-021). */
export const getNavigationV1 = defineHandler({
  ...endpoints.navigation,
  run: async ({ locale }) => toWireNavigation(await getNavigation(locale), locale),
})
