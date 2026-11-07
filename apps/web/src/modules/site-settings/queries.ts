import 'server-only'
import type { SiteSetting } from '@/payload-types'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'

export function getSiteSettings(locale: Locale): Promise<SiteSetting> {
  return cachedQuery(['site-settings', 'media'], ['site-settings', locale], async () => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'site-settings', locale, fallbackLocale: 'en', depth: 1 })
  })
}
