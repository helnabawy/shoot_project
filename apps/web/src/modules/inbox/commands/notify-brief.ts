import 'server-only'
import { briefDedupeKey, notificationsFor, renderTemplate, type Audience, type Channel, type NotificationEvent } from '@shoot/domain/booking'
import { formatBriefDate } from '@shoot/domain/brief/message'
import { buildWhatsAppLink, normaliseE164 } from '@shoot/domain/contact'
import { formatMoney } from '@shoot/domain/pricing'
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

/** 022: fixed titles of the offer notifications (static interface strings). */
export const OFFER_TITLES: Record<'offer-new' | 'offer-declined' | 'offer-lost', Record<Lang, string>> = {
  'offer-new': { en: 'New offer for your brief', ar: 'عرض جديد لطلبك' },
  'offer-declined': { en: 'The client chose another offer', ar: 'اختار العميل عرضاً آخر' },
  'offer-lost': { en: 'Brief went to another creator', ar: 'ذهب الطلب إلى محترف آخر' },
}

export const OFFERS_INBOX_PATH = '/account/inbox'

/**
 * 022 (US4-S9, FR-022): a creator made or changed an offer. The member client hears in the account and by
 * push, once per offer and change; the text names the creator and the amount, never the fee or the pin.
 */
export async function onOffer(
  actor: { payload: Payload },
  input: { briefId: number; creatorId: string; personaId: string; answerId: number | string; revisions: number; amountFils: number },
): Promise<void> {
  const { payload } = actor
  const [brief, profile, persona, settings] = await Promise.all([
    payload.findByID({ collection: 'briefs', id: input.briefId, depth: 0, overrideAccess: true, showHiddenFields: true }) as Promise<Brief & { accessSalt?: string | null }>,
    payload.findByID({ collection: 'creator-profiles', id: Number(input.creatorId), depth: 0, locale: 'all' as never, overrideAccess: true, draft: false }),
    payload.findByID({ collection: 'personas', id: Number(input.personaId), depth: 0, locale: 'all' as never, overrideAccess: true }),
    settingsOf(payload),
  ])
  const member = relId(brief.member)
  if (!member) return
  const event: NotificationEvent = 'offer-new'
  const locale: Lang = brief.locale === 'ar' ? 'ar' : 'en'
  const key = brief.accessSalt ? accessKey(brief.accessSalt, 'brief') : null
  const path = key ? `/match/${brief.reference}/${key}` : '/account'
  const render = (l: Lang) =>
    renderTemplate(templateText(settings.quickMatch?.templates ?? [], event, 'client', l), {
      ...briefVars(brief, l),
      creator: pick(profile.displayName as Localized, l),
      type: pick((persona as { singular?: Localized }).singular, l),
      price: formatMoney(input.amountFils, l),
      link: '',
    }).replace(/[:：]\s*$/, '.')
  const offer = { answerId: input.answerId, revisions: input.revisions }
  await writeOfferRow(payload, { brief: brief.id, event, audience: 'client', channel: 'in-app', locale, user: member, text: render(locale), link: absolute(path) }, offer)
  if (!(await writeOfferRow(payload, { brief: brief.id, event, audience: 'client', channel: 'push', locale, user: member, text: render(locale), link: path }, offer))) return
  await later(() => pushToUser(payload, member, (l) => ({ title: OFFER_TITLES[event][l], body: render(l), data: { event, path } })))
}

/** 022 (FR-014, FR-022): the client declined this creator's offer, or chose another creator for the type. */
export async function onOfferClosed(payload: Payload, input: { briefId: number; creatorId: string; event: 'offer-declined' | 'offer-lost' }): Promise<void> {
  const [brief, owner, settings] = await Promise.all([
    payload.findByID({ collection: 'briefs', id: input.briefId, depth: 0, overrideAccess: true }) as Promise<Brief>,
    payload.findByID({ collection: 'creator-profiles', id: Number(input.creatorId), depth: 0, overrideAccess: true, draft: true, select: { user: true } }),
    settingsOf(payload),
  ])
  const user = relId((owner as { user?: unknown }).user)
  if (!user) return
  const render = (l: Lang) => renderTemplate(templateText(settings.quickMatch?.templates ?? [], input.event, 'creator', l), briefVars(brief, l))
  await writeRow(payload, { brief: brief.id, event: input.event, audience: 'creator', channel: 'in-app', locale: 'en', user, text: render('en'), link: OFFERS_INBOX_PATH })
  if (!(await writeRow(payload, { brief: brief.id, event: input.event, audience: 'creator', channel: 'push', locale: 'en', user, text: render('en'), link: OFFERS_INBOX_PATH }))) return
  await later(() => pushToUser(payload, user, (l) => ({ title: OFFER_TITLES[input.event][l], body: render(l), data: { event: input.event, path: OFFERS_INBOX_PATH } })))
}

/** Like `writeRow`, keyed by the offer and its change so each change notifies once. */
async function writeOfferRow(
  payload: Payload,
  row: { brief: number; event: NotificationEvent; audience: Audience; channel: Channel; locale: Lang; user: number; text: string; link: string },
  offer: { answerId: number | string; revisions: number },
): Promise<boolean> {
  const dedupeKey = briefDedupeKey(row.brief, row.event, row.audience, row.channel, String(row.user), offer)
  if ((await payload.count({ collection: 'notifications', where: { dedupeKey: { equals: dedupeKey } }, overrideAccess: true })).totalDocs) return false
  try {
    await payload.create({ collection: 'notifications', data: { ...row, text: row.text.slice(0, 1000), dedupeKey }, overrideAccess: true })
    return true
  } catch (error) {
    if ((error as Error).name === 'ValidationError') return false
    throw error
  }
}
