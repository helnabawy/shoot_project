import 'server-only'
import type { Brief, SiteSetting, User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { getLandingPage } from '../landing/queries'
import { getActivePersonas } from '../personas/queries'
import { getTranslations } from 'next-intl/server'
import { getSiteSettings } from '../site-settings/queries'
import { buildBriefConfig, withBriefTime, type BriefTimeSettings } from './config'

export async function getBriefBuilderConfig(locale: Locale, options: { draft?: boolean } = {}) {
  const [landing, personas, settings] = await Promise.all([getLandingPage({ locale, draft: options.draft }), getActivePersonas(locale), getSiteSettings(locale)])
  const config = buildBriefConfig(landing, personas, locale)
  return config ? withBriefTime(config, await briefTimeOf(settings, locale)) : null
}

/** 026: the start time settings with their words; empty words fall back to the site's static strings. */
async function briefTimeOf(settings: SiteSetting, locale: Locale): Promise<BriefTimeSettings> {
  const time = settings.briefTime
  if (time?.enabled !== true) return { enabled: false, required: false, times: null, groupLabel: '', anyTime: '', connector: '' }
  const t = await getTranslations({ locale, namespace: 'brief.time' })
  return {
    enabled: true,
    required: time.required === true,
    times: time.times,
    groupLabel: time.groupLabel || t('groupLabel'),
    anyTime: time.anyTime || t('anyTime'),
    connector: time.connector || t('connector'),
  }
}

/** A member's own briefs, newest first (FR-052); never cached. */
export async function getMyBriefs(user: User): Promise<Brief[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'briefs',
    where: { member: { equals: user.id } },
    sort: '-createdAt',
    limit: 20,
    depth: 0,
    overrideAccess: false,
    user,
  })
  return docs
}
