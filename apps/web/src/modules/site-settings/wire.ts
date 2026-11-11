import type { SiteV1 } from '@shoot/domain/api/v1'
import { isE164 } from '@shoot/domain/contact'
import { interpolatePersonaCopy, type Persona } from '@shoot/domain/personas'
import type { SiteSetting } from '@/payload-types'
import { toWireImage, type WireContext } from '@/shared/api/wire'

const EXTERNAL = /^(https?:\/\/|mailto:|tel:)\S+$/i
const e164 = (value: string | null | undefined): string | null => (value && isE164(value) ? value : null)

/**
 * Site settings as the app may know them (008 data-model.md "Site"). Built field by field: the
 * brief limit, auto-publish, translation status, directory size, footer groups, the active audience
 * and everything in Quick Match but `enabled` stay behind (SC-005).
 */
export function toWireSite(settings: SiteSetting, personas: readonly Persona[], ctx: WireContext): SiteV1 {
  const label = (template: string | null | undefined) =>
    template && personas.length > 0 ? interpolatePersonaCopy(template, personas, { locale: ctx.locale }) : null
  return {
    locale: ctx.locale,
    siteName: settings.siteName,
    logo: toWireImage(settings.logo, ctx.base),
    logoDark: toWireImage(settings.logoDark, ctx.base),
    whatsapp: {
      number: e164(settings.whatsappNumber),
      defaultMessage: settings.whatsappDefaultMessage || null,
      expectedReplyTime: settings.expectedReplyTime || null,
    },
    phone: e164(settings.phoneNumber),
    contactEmail: settings.contactEmail || null,
    social: (settings.social ?? []).filter((s) => EXTERNAL.test(s.url)).map((s) => ({ label: s.platform, url: s.url })),
    labels: { seeker: label(settings.labels?.seekerLabel), provider: label(settings.labels?.providerLabel) },
    creatorCodePrefix: settings.creatorCodePrefix || 'CR',
    quickMatchEnabled: settings.quickMatch?.enabled === true,
  }
}
