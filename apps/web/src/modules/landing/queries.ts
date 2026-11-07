import 'server-only'
import type { LandingPage } from '@/payload-types'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'

/** Published landing page (or the latest draft in preview), cached per locale (FR-014). */
export function getLandingPage({ locale, draft = false }: { locale: Locale; draft?: boolean }): Promise<LandingPage> {
  return cachedQuery(
    ['landing-page', 'categories', 'option-sets', 'media'],
    ['landing-page', locale],
    async () => {
      const payload = await getPayloadClient()
      return payload.findGlobal({ slug: 'landing-page', locale, fallbackLocale: 'en', depth: 2, draft })
    },
    { bypass: draft },
  )
}
