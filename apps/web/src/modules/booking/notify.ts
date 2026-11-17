import { dedupeKey, notificationsFor, renderTemplate, type Audience, type Channel, type NotificationEvent } from '@shoot/domain/booking'
import { buildWhatsAppLink, normaliseE164 } from '@shoot/domain/contact'
import { formatBriefDate } from '@shoot/domain/brief/message'
import { formatMoney } from '@shoot/domain/pricing'
import { creatorAmountFils } from './rows'
import type { Payload, PayloadRequest } from 'payload'
import type { Booking } from '@/payload-types'
import { accessKey } from './keys'
import { absolute, quotePath } from './paths'

type Lang = 'en' | 'ar'
interface Recipient {
  audience: Audience
  locale: Lang
  phone: string | null
  userId: number | null
  /** 022: the creator profile, so their own offer replaces the client's total (FR-012). */
  creatorId?: number
}

const DEFAULT_CHANNELS: Record<Audience, Channel[]> = { client: ['whatsapp'], creator: ['in-app', 'whatsapp'], admin: ['in-app'] }
const relId = (v: unknown): number | null => (v == null ? null : typeof v === 'object' ? Number((v as { id: unknown }).id) : Number(v))

interface Template {
  event?: string | null
  audience?: string | null
  text?: string | Partial<Record<Lang, string | null>> | null
}

function templateText(templates: Template[], event: NotificationEvent, audience: Audience, locale: Lang): string {
  const row = templates.find((t) => t.event === event && t.audience === audience)
  const text = row?.text
  if (text && typeof text === 'object') return text[locale] || text.en || `${event} {reference}`
  return text || `${event} {reference}`
}

/** Creators to tell: the ones named, or every assigned creator. */
async function creatorRecipients(payload: Payload, booking: Booking, only: number[] | undefined, req?: PayloadRequest): Promise<Recipient[]> {
  const ids = (booking.assignments ?? []).map((a) => relId(a.creator)).filter((id): id is number => id !== null && (!only || only.includes(id)))
  if (!ids.length) return []
  const { docs } = await payload.find({ collection: 'creator-profiles', where: { id: { in: ids } }, depth: 1, pagination: false, draft: true, overrideAccess: true, select: { user: true }, req })
  return docs.map((p) => {
    const user = typeof p.user === 'object' && p.user ? p.user : null
    return { audience: 'creator' as const, locale: 'en' as const, phone: user?.phone ?? null, userId: relId(p.user), creatorId: p.id }
  })
}

type Localized = Partial<Record<Lang, string | null>> | string | null | undefined
const pick = (value: Localized, locale: Lang) => (typeof value === 'string' ? value : (value?.[locale] || value?.en || ''))

/** Runs `work` after the response when there is one (Next `after`), else at once (cron, scripts, tests). */
async function later(work: () => Promise<unknown>): Promise<void> {
  const { after } = await import('next/server')
  try {
    after(work)
  } catch {
    await work()
  }
}

/**
 * Writes the notification log for one change (FR-006, research §11). Nothing is sent: WhatsApp rows carry a
 * pre-filled wa.me link, in-app rows show on the account page. A creator or member client with the app also gets
 * one push per change (a `push` row is written first, so a repeated call pushes nothing), in each device's
 * language, opening the booking. A repeated call writes nothing new.
 */
export async function notify(
  payload: Payload,
  booking: Booking,
  event: NotificationEvent,
  options: { req?: PayloadRequest; creatorIds?: number[]; vars?: Record<string, string> } = {},
): Promise<number> {
  const settings = (await payload.findGlobal({ slug: 'site-settings', locale: 'all' as never, depth: 0, overrideAccess: true, req: options.req })) as unknown as {
    whatsappNumber?: string
    siteName?: Localized
    quickMatch?: { channels?: Partial<Record<Audience, Channel[] | null>> | null; templates?: Template[] | null } | null
  }
  const qm = settings.quickMatch ?? {}
  const clientLocale: Lang = booking.client?.locale === 'ar' ? 'ar' : 'en'
  const quotation = typeof booking.quotation === 'object' && booking.quotation ? booking.quotation : null
  const reference = quotation?.reference ?? booking.reference
  const salt = (booking as { accessSalt?: string | null }).accessSalt
  const clientLink = salt ? absolute(quotePath(reference, accessKey(salt, 'booking'), clientLocale)) : absolute('/account/bookings')

  let written = 0
  const pushes: ((send: typeof import('@/modules/push').pushToUser) => Promise<unknown>)[] = []
  for (const audience of notificationsFor(event)) {
    const recipients: Recipient[] =
      audience === 'client'
        ? [{ audience, locale: clientLocale, phone: booking.client?.whatsapp ?? null, userId: relId(booking.member) }]
        : audience === 'creator'
          ? await creatorRecipients(payload, booking, options.creatorIds, options.req)
          : [{ audience, locale: 'en', phone: settings.whatsappNumber ?? null, userId: null }]
    const channels = qm.channels?.[audience]?.length ? (qm.channels[audience] as Channel[]) : DEFAULT_CHANNELS[audience]
    // 022 (FR-012): creators hear their own offer, never the client's total with the service fee.
    const quotationDoc =
      booking.quotation && typeof booking.quotation !== 'object'
        ? await payload.findByID({ collection: 'quotations', id: booking.quotation as number, depth: 0, overrideAccess: true, req: options.req }).catch(() => null)
        : booking.quotation
    const totalFor = (recipient: Recipient, locale: Lang) => {
      const own = recipient.creatorId != null ? creatorAmountFils({ ...booking, quotation: quotationDoc }, recipient.creatorId) : null
      const fils = own ?? booking.totalFils
      return fils != null ? formatMoney(fils, locale) : ''
    }
    for (const recipient of recipients) {
      const link = audience === 'client' ? clientLink : audience === 'creator' ? absolute('/account/bookings') : absolute(`/admin/collections/bookings/${booking.id}`)
      const vars = {
        reference,
        name: (booking.client?.name ?? '').split(' ')[0] ?? '',
        date: booking.date ? formatBriefDate(booking.date, recipient.locale) : '',
        total: totalFor(recipient, recipient.locale),
        link,
        ...options.vars,
      }
      const template = templateText(qm.templates ?? [], event, audience, recipient.locale)
      for (const channel of channels) {
        // In the account the row itself links to the booking, so the text carries no raw URL.
        const text = renderTemplate(template, channel === 'in-app' ? { ...vars, link: '' } : vars)
          .replace(/[:：]\s*$/, '.')
          .slice(0, 1000)
        // Admin rows need no user: every admin reads them in the content area.
        if (channel === 'in-app' && !recipient.userId && audience !== 'admin') continue
        const phone = recipient.phone ? normaliseE164(recipient.phone) : null
        if (channel === 'whatsapp' && !phone) continue
        if (channel === 'email') continue // feature 008 adds email addresses and sending.
        const key = dedupeKey(booking.id, booking.revision ?? 0, event, audience, channel, String(recipient.userId ?? ''))
        const exists = await payload.count({ collection: 'notifications', where: { dedupeKey: { equals: key } }, overrideAccess: true, req: options.req })
        if (exists.totalDocs) continue
        try {
          await payload.create({
            collection: 'notifications',
            data: {
              booking: booking.id,
              event,
              audience,
              channel,
              locale: recipient.locale,
              user: recipient.userId,
              text,
              link: channel === 'whatsapp' && phone ? buildWhatsAppLink(phone, text) : link,
              dedupeKey: key,
            },
            overrideAccess: true,
            req: options.req,
          })
          written += 1
        } catch (error) {
          // A concurrent identical change already wrote this row (unique dedupe key).
          if ((error as Error).name !== 'ValidationError') throw error
        }
      }
      // The app (feature 019's devices): one push per person per change; admins work in the content area.
      if (audience !== 'admin' && recipient.userId) {
        const key = dedupeKey(booking.id, booking.revision ?? 0, event, audience, 'push', String(recipient.userId))
        const path = audience === 'creator' ? `/account/bookings/${booking.reference}` : salt ? quotePath(reference, accessKey(salt, 'booking'), 'en') : '/account/bookings'
        const text = (locale: Lang) =>
          renderTemplate(templateText(qm.templates ?? [], event, audience, locale), { ...vars, date: booking.date ? formatBriefDate(booking.date, locale) : '', total: totalFor(recipient, locale), link: '' })
            .replace(/[:：]\s*$/, '.')
            .slice(0, 1000)
        const exists = await payload.count({ collection: 'notifications', where: { dedupeKey: { equals: key } }, overrideAccess: true, req: options.req })
        if (exists.totalDocs) continue
        try {
          await payload.create({
            collection: 'notifications',
            data: { booking: booking.id, event, audience, channel: 'push', locale: recipient.locale, user: recipient.userId, text: text(recipient.locale), link: path, dedupeKey: key },
            overrideAccess: true,
            req: options.req,
          })
        } catch (error) {
          if ((error as Error).name !== 'ValidationError') throw error
          continue
        }
        written += 1
        const userId = recipient.userId
        pushes.push((pushToUser) => pushToUser(payload, userId, (locale) => ({ title: pick(settings.siteName, locale), body: text(locale), data: { event, path } })))
      }
    }
  }
  // After the rows are saved: a slow or failing push service never holds up the change (019 FR-019).
  // Loaded lazily: the push module is server-only and this file is also loaded by the Payload CLI (hooks).
  if (pushes.length) {
    const { pushToUser } = await import('@/modules/push')
    await later(() => Promise.all(pushes.map((send) => send(pushToUser))))
  }
  return written
}
