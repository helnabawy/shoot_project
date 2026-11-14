import 'server-only'
import { briefDedupeKey, notificationsFor, renderTemplate, type Audience, type Channel, type NotificationEvent } from '@shoot/domain/booking'
import { formatBriefDate } from '@shoot/domain/brief/message'
import { buildWhatsAppLink, normaliseE164 } from '@shoot/domain/contact'
import { after } from 'next/server'
import type { Payload } from 'payload'
import { absolute, accessKey, matchPath } from '@/modules/booking'
import { pushToUser } from '@/modules/push'
import type { Brief } from '@/payload-types'
import type { OnAccepted } from './answer-brief'

/**
 * Brief notifications (feature 019, research R6): rows in the notification log keyed by brief, and app
 * pushes. A push row is written before the push goes out, so the dedupe key makes it one push per brief,
 * event and recipient (US4-S6). Texts come from the content area and never carry the client's name,
 * number or email (FR-019).
 */

type Lang = 'en' | 'ar'
interface Template {
  event?: string | null
  audience?: string | null
  text?: string | Partial<Record<Lang, string | null>> | null
}
type Localized = Partial<Record<Lang, string | null>> | string | null | undefined

const relId = (v: unknown): number | null => (v == null ? null : typeof v === 'object' ? Number((v as { id: unknown }).id) : Number(v))
const pick = (value: Localized, locale: Lang) => (typeof value === 'string' ? value : (value?.[locale] ?? value?.en ?? ''))

async function settingsOf(payload: Payload) {
  return (await payload.findGlobal({ slug: 'site-settings', locale: 'all' as never, depth: 0, overrideAccess: true })) as unknown as {
    siteName?: Localized
    whatsappNumber?: string
    quickMatch?: { templates?: Template[] | null } | null
  }
}

export function templateText(templates: readonly Template[], event: NotificationEvent, audience: Audience, locale: Lang): string {
  const text = templates.find((t) => t.event === event && t.audience === audience)?.text
  if (text && typeof text === 'object') return text[locale] || text.en || ''
  return text || ''
}

/** Runs `work` after the response when there is a request (Next `after`), else at once (scripts, tests). */
export async function later(work: () => Promise<unknown>): Promise<void> {
  try {
    after(work)
  } catch {
    await work()
  }
}

/** Writes one notification row unless its dedupe key exists; true when this call wrote it. */
export async function writeRow(
  payload: Payload,
  row: { brief: number; event: NotificationEvent; audience: Audience; channel: Channel; locale: Lang; user: number | null; text: string; link: string },
  /** Who the row is about besides the recipient (the creator who said yes): one row each. */
  about = '',
): Promise<boolean> {
  const dedupeKey = briefDedupeKey(row.brief, row.event, row.audience, row.channel, [row.user ?? '', about].filter(String).join('/'))
  if ((await payload.count({ collection: 'notifications', where: { dedupeKey: { equals: dedupeKey } }, overrideAccess: true })).totalDocs) return false
  try {
    await payload.create({ collection: 'notifications', data: { ...row, text: row.text.slice(0, 1000), dedupeKey }, overrideAccess: true })
    return true
  } catch (error) {
    if ((error as Error).name === 'ValidationError') return false
    throw error
  }
}

/** The brief's words for templates, in the language of the selections the client made. */
function briefVars(brief: Brief, locale: Lang) {
  const label = (token: string) => (brief.selections ?? []).find((s) => s.token === token)
  const occasion = (brief.selections ?? []).find((s) => !['persona', 'date', 'duration', 'location', 'shotBy'].includes(s.token))
  return {
    reference: brief.reference ?? '',
    occasion: occasion?.label ?? occasion?.value ?? '',
    emirate: label('location')?.label ?? label('location')?.value ?? '',
    date: brief.date ? formatBriefDate(String(brief.date).slice(0, 10), locale) : '',
  }
}

/** Fixed titles of app notifications, per language (static interface strings, not product copy). */
export const PUSH_TITLES: Record<'brief-accepted' | 'brief-new', Record<Lang, string>> = {
  'brief-accepted': { en: 'A creator said yes', ar: 'محترف وافق على طلبك' },
  'brief-new': { en: 'New brief for you', ar: 'طلب جديد لك' },
}

/** A creator said yes (US4, FR-010): admins in the content area with a WhatsApp link to forward; the member client in the account and by push. */
export const onAccepted: OnAccepted = async (actor, { briefId, creatorId, personaId }) => {
  const { payload } = actor
  const [brief, profile, persona, settings] = await Promise.all([
    payload.findByID({ collection: 'briefs', id: briefId, depth: 0, overrideAccess: true, showHiddenFields: true }) as Promise<Brief & { accessSalt?: string | null }>,
    payload.findByID({ collection: 'creator-profiles', id: Number(creatorId), depth: 0, locale: 'all' as never, overrideAccess: true, draft: false }),
    payload.findByID({ collection: 'personas', id: Number(personaId), depth: 0, locale: 'all' as never, overrideAccess: true }),
    settingsOf(payload),
  ])
  const event: NotificationEvent = 'brief-accepted'
  const templates = settings.quickMatch?.templates ?? []
  const clientLocale: Lang = brief.locale === 'ar' ? 'ar' : 'en'
  const key = brief.accessSalt ? accessKey(brief.accessSalt, 'brief') : null
  const clientPath = key ? `/match/${brief.reference}/${key}` : '/account'
  const clientLink = key ? absolute(matchPath(brief.reference ?? '', key, clientLocale)) : absolute('/account')
  const member = relId(brief.member)
  const vars = (locale: Lang, link: string) => ({
    ...briefVars(brief, locale),
    creator: pick(profile.displayName as Localized, locale),
    type: pick((persona as { singular?: Localized }).singular, locale),
    link,
  })
  const render = (audience: Audience, locale: Lang, link: string) => renderTemplate(templateText(templates, event, audience, locale), vars(locale, link)).replace(/[:：]\s*$/, '.')

  for (const audience of notificationsFor(event)) {
    if (audience === 'admin') {
      await writeRow(payload, { brief: brief.id, event, audience, channel: 'in-app', locale: 'en', user: null, text: render('admin', 'en', ''), link: absolute(`/admin/collections/briefs/${brief.id}`) }, creatorId)
      // The team forwards the client's message on WhatsApp (also how a visitor without an account hears).
      const phone = brief.contact?.whatsapp ? normaliseE164(brief.contact.whatsapp) : null
      if (phone) {
        const clientText = render('client', clientLocale, clientLink)
        await writeRow(payload, { brief: brief.id, event, audience, channel: 'whatsapp', locale: clientLocale, user: null, text: render('admin', 'en', clientLink), link: buildWhatsAppLink(phone, clientText) }, creatorId)
      }
      continue
    }
    if (!member) continue
    await writeRow(payload, { brief: brief.id, event, audience, channel: 'in-app', locale: clientLocale, user: member, text: render('client', clientLocale, ''), link: clientLink }, creatorId)
    // One push per creator who says yes: the push row is keyed by the brief, the event and that creator.
    const pushKeyed = await writeRow(payload, { brief: brief.id, event, audience, channel: 'push', locale: clientLocale, user: member, text: render('client', clientLocale, ''), link: clientPath }, creatorId)
    if (!pushKeyed) continue
    await later(() =>
      pushToUser(payload, member, (locale) => ({ title: PUSH_TITLES[event][locale], body: render('client', locale, ''), data: { event, path: clientPath } })),
    )
  }
}
