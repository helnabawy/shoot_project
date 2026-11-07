import 'server-only'
import type { Brief, User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { getLandingPage } from '../landing/queries'
import { getActivePersonas } from '../personas/queries'
import { buildBriefConfig } from './config'

export async function getBriefBuilderConfig(locale: Locale, options: { draft?: boolean } = {}) {
  const [landing, personas] = await Promise.all([getLandingPage({ locale, draft: options.draft }), getActivePersonas(locale)])
  return buildBriefConfig(landing, personas, locale)
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
