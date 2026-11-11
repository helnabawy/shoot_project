import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { wireContext } from '@/shared/api/wire'
import { getActivePersonas } from '../personas/queries'
import { getSiteSettings } from './queries'
import { toWireSite } from './wire'

/** `GET /api/mobile/v1/site`: contact details, labels and switches the app needs (FR-020). */
export const getSiteV1 = defineHandler({
  ...endpoints.site,
  run: async ({ locale }) => {
    const [settings, personas] = await Promise.all([getSiteSettings(locale), getActivePersonas(locale)])
    return toWireSite(settings, personas, wireContext(locale))
  },
})
