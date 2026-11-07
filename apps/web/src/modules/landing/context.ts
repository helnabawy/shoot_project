import 'server-only'
import type { Locale } from '@/shared/lib/locale'
import { getSpecialtyCounts } from '../creators'
import { getActivePersonas, getCategoriesForAudience } from '../personas/queries'
import { getSiteSettings } from '../site-settings/queries'
import type { BlockContext } from './components/RenderBlocks'

/** What the landing sections need to render on any page: contact details, audience and real counts. */
export async function getBlockContext(locale: Locale): Promise<BlockContext> {
  const [settings, personas, categories, specialtyCounts] = await Promise.all([
    getSiteSettings(locale),
    getActivePersonas(locale),
    getCategoriesForAudience(locale),
    getSpecialtyCounts(locale),
  ])
  return {
    contact: { whatsappNumber: settings.whatsappNumber, whatsappMessage: settings.whatsappDefaultMessage, phoneNumber: settings.phoneNumber },
    personas,
    categories,
    specialtyCounts,
    locale,
  }
}
