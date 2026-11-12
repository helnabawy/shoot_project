import 'server-only'
import type { BookingViewV1 } from '@shoot/domain/api/v1'
import { allowedEvents, effectiveState, type BookingState } from '@shoot/domain/booking'
import { formatMoney } from '@shoot/domain/pricing'
import { getTranslations } from 'next-intl/server'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { getDirectoryContext, toWireCreatorCard } from '@/modules/creators'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { wireContext } from '@/shared/api/wire'
import type { Locale } from '@/shared/lib/locale'
import { getMatchPage } from '../match'
import type { QuotationAccess } from '../queries'
import { idOf, toAssignments } from '../rows'
import { getPayloadClient } from '@/shared/lib/payload'

/**
 * The booking behind a private link as the app's one screen model (012 US3 to US5, research R9):
 * the state as it stands now, the price lines stored at issue, the progress, what the person can do
 * next, and a WhatsApp link. Never a phone number, a payment detail or the key's salt (FR-034).
 */

const NAME = (rel: unknown, key: string) => (rel && typeof rel === 'object' ? String((rel as Record<string, unknown>)[key] ?? '') : '')

export function nextStepFor(state: BookingState, lapsed: boolean): BookingViewV1['nextStep'] {
  switch (state) {
    case 'quoted':
      return 'accept'
    case 'accepted':
      return lapsed ? 'chooseAnother' : 'waitProfessional'
    case 'confirmed':
      return 'pay'
    case 'paid':
    case 'scheduled':
      return 'shootDay'
    case 'delivered':
      return 'confirmDelivery'
    case 'expired':
      return 'freshQuotation'
    case 'on-hold':
      return 'contactTeam'
    default:
      return 'none'
  }
}

export async function quotationView(access: QuotationAccess, options: { locale: Locale; now: Date }): Promise<BookingViewV1> {
  const { locale, now } = options
  const payload = await getPayloadClient()
  const { quotation, booking, current } = access
  const state = effectiveState({ state: booking.state as BookingState, validUntil: booking.quoteValidUntil ?? null }, now)
  const isCurrent = quotation.id === current.id
  const [settings, t] = await Promise.all([getSiteSettings(locale), getTranslations({ locale, namespace: 'quote' })])

  const assignments = toAssignments(booking.assignments)
  const lapsedTypes = assignments.filter((a) => a.status === 'declined' || a.status === 'lapsed').map((a) => a.personaId)
  const lapsed = state === 'accepted' && lapsedTypes.length > 0

  let replacements: BookingViewV1['replacements'] = []
  if (lapsed) {
    const brief = await payload.findByID({ collection: 'briefs', id: Number(idOf(booking.brief)), depth: 0, overrideAccess: true })
    const [page, context] = await Promise.all([getMatchPage(brief, locale, now, { date: booking.date ?? null }), getDirectoryContext(locale)])
    const ctx = wireContext(locale)
    replacements = page.sections
      .filter((s) => lapsedTypes.includes(s.persona.id))
      .map((s) => ({
        persona: { slug: s.persona.slug, singular: s.persona.singular },
        creators: s.creators.slice(0, 8).map((c) => toWireCreatorCard(c, context.lookups, context.prefix, ctx)),
      }))
  }

  const reference = current.reference
  const total = formatMoney(current.totalFils, locale)
  const text = state === 'confirmed' ? t('receiptMessage', { reference, total }) : t('whatsappMessage', { reference })
  const brief = typeof booking.brief === 'object' ? booking.brief : null
  const at = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString() : null)
  const progress: BookingViewV1['progress'] = [
    { key: 'briefSent', at: at(current.issuedAt) },
    { key: 'confirmed', at: at(booking.confirmedAt) },
    { key: 'paid', at: at(booking.paidAt) },
    { key: 'shootDay', at: at(booking.scheduledAt) },
    { key: 'delivered', at: at(booking.deliveredAt) },
    { key: 'completed', at: at(booking.completedAt) },
  ]

  return {
    locale,
    reference,
    state,
    nextStep: nextStepFor(state, lapsed),
    sentence: brief?.sentence ?? '',
    issuedAt: new Date(current.issuedAt).toISOString(),
    validUntil: new Date(current.validUntil).toISOString(),
    shootDate: booking.date ?? null,
    startTime: booking.details?.startTime ?? null,
    totalFils: current.totalFils,
    lines: (current.lines ?? []).map((l) => {
      const d = (l.deliverables ?? null) as { en?: string[]; ar?: string[] } | null
      return { kind: l.kind, label: locale === 'ar' ? l.labelAr : l.labelEn, amountFils: l.amountFils, includes: d?.[locale] ?? [] }
    }),
    professionals: (booking.assignments ?? []).map((a) => ({
      type: NAME(a.persona, 'singular'),
      name: NAME(a.creator, 'displayName') || null,
      code: NAME(a.creator, 'code') || null,
    })),
    progress,
    canAccept: isCurrent && state === 'quoted',
    canConfirmDelivery: isCurrent && state === 'delivered',
    canReport: isCurrent && allowedEvents(state, 'client').includes('hold'),
    replacements,
    holdReason: state === 'on-hold' ? (booking.holdReason ?? null) : null,
    whatsappUrl: whatsappHref(settings.whatsappNumber, text),
  }
}
