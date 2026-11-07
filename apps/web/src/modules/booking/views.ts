import 'server-only'
import { allowedEvents, effectiveState, formatPicks, parsePicks, withPick, type BookingState, type Pick } from '@shoot/domain/booking'
import { formatBriefDate } from '@shoot/domain/brief/message'
import { formatMoney } from '@shoot/domain/pricing'
import { getTranslations } from 'next-intl/server'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { describeCreator, type DirectoryContext } from '@/modules/creators'
import type { Booking, SiteSetting } from '@/payload-types'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import type { BookingStatusProps } from './components/BookingStatus'
import type { CreatorBookingView } from './components/CreatorBookingRow'
import type { MatchResultsProps } from './components/MatchResults'
import type { QuotationViewProps } from './components/QuotationView'
import type { MatchSectionView, PickRowView } from './components/types'
import type { MatchPage } from './match'
import { detailsPath, matchPath, memberBookingPath, quotePath } from './paths'
import type { QuotationAccess } from './queries'
import { idOf, toAssignments } from './rows'

const DATE_TIME = (locale: Locale) =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })

export const formatDay = (iso: string, locale: Locale) => formatBriefDate(iso.slice(0, 10), locale)
export const formatDateTime = (iso: string, locale: Locale) => DATE_TIME(locale).format(new Date(iso))

function rowView(c: MatchPage['sections'][number]['creators'][number], ctx: DirectoryContext, locale: Locale, href: string, chosen: boolean): PickRowView {
  const view = describeCreator(c, ctx.lookups, ctx.prefix, locale)
  return { id: c.id, code: c.code, displayCode: view.displayCode, name: view.name, initials: view.initials, photo: c.photo, meta: view.specialties || view.place, href, chosen }
}

/** Step 2's view (QM-US1): chosen picks stay in the URL, so the whole flow works without JavaScript. */
export function matchView(
  page: MatchPage,
  options: { ref: string; key: string; locale: Locale; picks: Pick[]; date: string | null; ctx: DirectoryContext; settings: SiteSetting; sentence: string },
): MatchResultsProps {
  const { ref, key, locale, ctx } = options
  const base = matchPath(ref, key, locale)
  const dateQuery = options.date && options.date !== page.facts.date ? `&date=${options.date}` : ''
  const target = (picks: Pick[]) => {
    const complete = page.sections.every((s) => picks.some((p) => p.persona === s.persona.slug))
    const query = formatPicks(picks)
    return complete && page.sections.length === 1 ? `${detailsPath(ref, key, locale, query)}${dateQuery}` : `${base}?pick=${encodeURIComponent(query)}${dateQuery}`
  }
  const fixed = page.brief.creator ? idOf(page.brief.creator) : null
  const sections: MatchSectionView[] = page.sections.map((s) => {
    const current = options.picks.find((p) => p.persona === s.persona.slug)
    const creators = fixed ? [...s.creators.filter((c) => c.id === fixed), ...s.creators.filter((c) => c.id !== fixed)] : s.creators
    const tier = s.price.ok ? s.price.lines.find((l) => l.kind === 'tier') : undefined
    return {
      personaId: s.persona.id,
      plural: s.persona.plural,
      singular: s.persona.singular,
      price: s.price.ok ? formatMoney(s.price.total, locale) : null,
      deliverables: tier?.deliverables?.[locale] ?? [],
      creators: creators.map((c) => rowView(c, ctx, locale, target(withPick(options.picks, { persona: s.persona.slug, code: c.code })), current?.code === c.code)),
      anyHref: target(withPick(options.picks, { persona: s.persona.slug, code: null })),
      anyChosen: Boolean(current && current.code === null),
    }
  })
  const allPicked = page.sections.length > 1 && page.sections.every((s) => options.picks.some((p) => p.persona === s.persona.slug))
  return {
    sentence: options.sentence,
    editHref: localizeHref('/', locale),
    dateLabel: options.date ? formatDay(options.date, locale) : null,
    sections,
    nearby: page.nearby.map((d) => ({ label: formatDay(d, locale), href: `${base}?date=${d}${options.picks.length ? `&pick=${encodeURIComponent(formatPicks(options.picks))}` : ''}` })),
    whatsappHref: whatsappHref(options.settings.whatsappNumber, options.sentence) ?? '#',
    continueHref: allPicked ? `${detailsPath(ref, key, locale, formatPicks(options.picks))}${dateQuery}` : null,
    priceOnRequest: !page.total.ok,
  }
}

/** Picks from the query string limited to this brief's types. */
export function picksFor(page: MatchPage, raw: string | undefined): Pick[] {
  const picks = parsePicks(raw) ?? []
  return picks.filter((p) => page.sections.some((s) => s.persona.slug === p.persona))
}

const NAME = (rel: unknown, key: string) => (rel && typeof rel === 'object' ? String((rel as Record<string, unknown>)[key] ?? '') : '')

/** The quotation page's view: the frozen document plus the booking's state and its one client action. */
export async function quotationView(
  access: QuotationAccess,
  options: { locale: Locale; key: string; now: Date; settings: SiteSetting; replacements: BookingStatusProps['replacements']; prefix: string },
): Promise<{ view: Omit<QuotationViewProps, 'status' | 'notice' | 'error'>; status: BookingStatusProps }> {
  const { locale, now } = options
  const t = await getTranslations({ locale, namespace: 'quote' })
  const { quotation, booking, current } = access
  const state = effectiveState({ state: booking.state as BookingState, validUntil: booking.quoteValidUntil ?? null }, now)
  const isCurrent = quotation.id === current.id
  const money = (fils: number) => formatMoney(fils, locale)
  const brief = typeof booking.brief === 'object' ? booking.brief : null
  const assignments = booking.assignments ?? []
  const creators = assignments.map((a) => ({ type: NAME(a.persona, 'singular'), name: NAME(a.creator, 'displayName') || null }))
  const names = creators.map((c) => c.name).filter(Boolean).join(locale === 'ar' ? ' و' : ' and ')
  const pending = toAssignments(assignments).find((a) => a.status === 'pending' && a.respondBy)
  const total = money(current.totalFils)
  const date = booking.date ? formatDay(booking.date, locale) : ''
  const sentenceKey = state === 'accepted' && !names ? 'acceptedOpen' : state
  const sentence = t(`status.${sentenceKey}` as never, { date: state === 'quoted' ? formatDateTime(current.validUntil, locale) : date, creators: names, time: pending?.respondBy ? formatDateTime(pending.respondBy, locale) : '', total } as never)
  const reference = current.reference
  const receipt = t('receiptMessage', { reference, total })
  const qm = (options.settings as unknown as { quickMatch?: { paymentInstructions?: unknown; quotationTerms?: unknown } }).quickMatch
  const history = (['acceptedAt', 'confirmedAt', 'paidAt', 'scheduledAt', 'deliveredAt', 'completedAt', 'onHoldAt', 'cancelledAt', 'expiredAt'] as const)
    .filter((f) => booking[f])
    .map((f) => ({ label: t(`event.${f}` as never), at: formatDateTime(booking[f] as string, locale) }))
  // Only a creator who declined or did not answer is replaced by the client; "let us choose" is the team's job.
  const lapsedTypes = toAssignments(assignments).filter((a) => a.status === 'declined' || a.status === 'lapsed').map((a) => a.personaId)
  const replacementSentence = (type: string) => t('status.lapsed', { type })

  return {
    view: {
      reference: quotation.reference,
      version: quotation.version ?? 1,
      issued: formatDateTime(quotation.issuedAt, locale),
      validUntil: formatDateTime(quotation.validUntil, locale),
      replacedBy: isCurrent ? null : { reference: current.reference, href: options.key ? quotePath(current.reference, options.key, locale) : memberBookingPath(current.reference, locale) },
      sentence: brief?.sentence ?? '',
      creators,
      lines: (quotation.lines ?? []).map((l) => {
        const d = (l.deliverables ?? null) as { en?: string[]; ar?: string[] } | null
        return { kind: l.kind, label: locale === 'ar' ? l.labelAr : l.labelEn, amount: money(l.amountFils), deliverables: d?.[locale] ?? [] }
      }),
      total: money(quotation.totalFils),
      terms: (qm?.quotationTerms ?? null) as QuotationViewProps['terms'],
      whatsappHref: whatsappHref(options.settings.whatsappNumber, t('whatsappMessage', { reference })) ?? '#',
    },
    status: {
      state,
      access: { ref: quotation.reference, key: options.key, locale },
      sentence,
      canAccept: isCurrent && state === 'quoted',
      // While quoted, ignoring the quotation is enough: Accept stays the only action (Principle IX).
      canCancel: isCurrent && state !== 'quoted' && allowedEvents(state, 'client').includes('cancel'),
      payment: state === 'confirmed' ? { instructions: (qm?.paymentInstructions ?? null) as never, receiptHref: whatsappHref(options.settings.whatsappNumber, receipt) ?? '#' } : null,
      replacements:
        state === 'accepted'
          ? options.replacements.filter((r) => lapsedTypes.includes(r.personaId)).map((r) => ({ ...r, sentence: replacementSentence(r.type) }))
          : [],
      history,
    },
  }
}

/** The creator's rows (QM-US3): the client's first name only, never a phone number. */
export function creatorBookingViews(bookings: Booking[], profileIds: number[], locale: Locale, locationName: (slug: string) => string): CreatorBookingView[] {
  const mine = profileIds.map(String)
  const rows: CreatorBookingView[] = []
  for (const b of bookings) {
    const brief = typeof b.brief === 'object' ? b.brief : null
    for (const a of toAssignments(b.assignments)) {
      if (!a.creatorId || !mine.includes(a.creatorId)) continue
      rows.push({
        bookingId: b.id,
        personaId: a.personaId,
        reference: b.reference,
        state: b.state,
        awaitingAnswer: b.state === 'accepted' && a.status === 'pending',
        date: b.date ?? '',
        dateLabel: b.date ? formatDay(b.date, locale) : '',
        place: b.location ? locationName(b.location) : '',
        sentence: brief?.sentence ?? '',
        price: b.totalFils != null ? formatMoney(b.totalFils, locale) : '',
        clientFirstName: (b.client?.name ?? '').split(' ')[0] ?? '',
        respondBy: a.respondBy ? formatDateTime(a.respondBy, locale) : null,
      })
    }
  }
  return rows.sort((x, y) => Number(y.awaitingAnswer) - Number(x.awaitingAnswer) || x.date.localeCompare(y.date))
}

