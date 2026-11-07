import { dedupeKey, notificationsFor, renderTemplate, type Audience, type Channel, type NotificationEvent } from '@shoot/domain/booking'
import { buildWhatsAppLink, normaliseE164 } from '@shoot/domain/contact'
import { formatBriefDate } from '@shoot/domain/brief/message'
import { formatMoney } from '@shoot/domain/pricing'
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
    return { audience: 'creator' as const, locale: 'en' as const, phone: user?.phone ?? null, userId: relId(p.user) }
  })
}

/**
 * Writes the notification log for one change (FR-006, research §11). Nothing is sent: WhatsApp rows carry a
 * pre-filled wa.me link, in-app rows show on the account page. A repeated call writes nothing new.
 */
export async function notify(
  payload: Payload,
  booking: Booking,
  event: NotificationEvent,
  options: { req?: PayloadRequest; creatorIds?: number[]; vars?: Record<string, string> } = {},
): Promise<number> {
  const settings = (await payload.findGlobal({ slug: 'site-settings', locale: 'all' as never, depth: 0, overrideAccess: true, req: options.req })) as unknown as {
    whatsappNumber?: string
    quickMatch?: { channels?: Partial<Record<Audience, Channel[] | null>> | null; templates?: Template[] | null } | null
  }
  const qm = settings.quickMatch ?? {}
  const clientLocale: Lang = booking.client?.locale === 'ar' ? 'ar' : 'en'
  const quotation = typeof booking.quotation === 'object' && booking.quotation ? booking.quotation : null
  const reference = quotation?.reference ?? booking.reference
  const salt = (booking as { accessSalt?: string | null }).accessSalt
  const clientLink = salt ? absolute(quotePath(reference, accessKey(salt, 'booking'), clientLocale)) : absolute('/account/bookings')

  let written = 0
  for (const audience of notificationsFor(event)) {
    const recipients: Recipient[] =
      audience === 'client'
        ? [{ audience, locale: clientLocale, phone: booking.client?.whatsapp ?? null, userId: relId(booking.member) }]
        : audience === 'creator'
          ? await creatorRecipients(payload, booking, options.creatorIds, options.req)
          : [{ audience, locale: 'en', phone: settings.whatsappNumber ?? null, userId: null }]
    const channels = qm.channels?.[audience]?.length ? (qm.channels[audience] as Channel[]) : DEFAULT_CHANNELS[audience]
    for (const recipient of recipients) {
      const link = audience === 'client' ? clientLink : audience === 'creator' ? absolute('/account/bookings') : absolute(`/admin/collections/bookings/${booking.id}`)
      const vars = {
        reference,
        name: (booking.client?.name ?? '').split(' ')[0] ?? '',
        date: booking.date ? formatBriefDate(booking.date, recipient.locale) : '',
        total: booking.totalFils != null ? formatMoney(booking.totalFils, recipient.locale) : '',
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
    }
  }
  return written
}
