import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import type { Payload } from 'payload'
import { getDirectoryContext, getPublicCreators, getSpecialtyCounts } from '../creators'
import { getActivePersonas, getCategoriesForAudience } from '../personas/queries'
import { getSiteSettings } from '../site-settings/queries'
import { defineHandler } from '@/shared/api/handler'
import { wireContext } from '@/shared/api/wire'
import type { Locale } from '@/shared/lib/locale'
import { getLandingPage } from './queries'
import { toWireLanding, type SectionBlock, type SectionContext } from './wire'

/** Block types already reported, so an unknown type is logged once, not on every request. */
const reported = new Set<string>()

/**
 * Everything `toWireSection` resolves against, read like the website's `getBlockContext`. The
 * listed creators are read only when a `creatorNetwork` block is on the page.
 */
export async function getSectionContext(locale: Locale, blocks: readonly SectionBlock[] | null | undefined, payload?: Payload): Promise<SectionContext> {
  const wantsCreators = (blocks ?? []).some((b) => b.blockType === 'creatorNetwork')
  const [settings, personas, categories, specialtyCounts, creators, directory] = await Promise.all([
    getSiteSettings(locale),
    getActivePersonas(locale),
    getCategoriesForAudience(locale),
    getSpecialtyCounts(locale),
    wantsCreators ? getPublicCreators(locale) : Promise.resolve([]),
    wantsCreators ? getDirectoryContext(locale) : Promise.resolve(null),
  ])
  return {
    ...wireContext(locale),
    contact: { whatsappNumber: settings.whatsappNumber, whatsappMessage: settings.whatsappDefaultMessage, phoneNumber: settings.phoneNumber },
    personas,
    categories,
    specialtyCounts,
    creators,
    directory: directory ? { lookups: directory.lookups, prefix: directory.prefix } : null,
    onUnknown: (blockType) => {
      if (reported.has(blockType)) return
      reported.add(blockType)
      payload?.logger.warn({ blockType }, 'mobile api: a section type has no v1 shape and is skipped')
    },
  }
}

/** `GET /api/mobile/v1/landing`: hero, in-page anchors and the resolved sections (FR-024). */
export const getLandingV1 = defineHandler({
  ...endpoints.landing,
  run: async ({ locale, payload }) => {
    const landing = await getLandingPage({ locale })
    return toWireLanding(landing, await getSectionContext(locale, landing.sections, payload))
  },
})
