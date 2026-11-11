import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { wireContext } from '@/shared/api/wire'
import { getActivePersonas, getCategoriesForAudience } from './queries'
import { toWireCategory, toWirePersona } from './wire'

/** `GET /api/mobile/v1/personas`: the active audience in Site Settings order, with its categories (FR-022). */
export const getPersonasV1 = defineHandler({
  ...endpoints.personas,
  run: async ({ locale }) => {
    const { base } = wireContext(locale)
    const [personas, categories] = await Promise.all([getActivePersonas(locale), getCategoriesForAudience(locale)])
    return { locale, personas: personas.map(toWirePersona), categories: categories.map((c) => toWireCategory(c, base)) }
  },
})
