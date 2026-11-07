import 'server-only'
import { getTranslations } from 'next-intl/server'
import { getDirectoryContext } from '@/modules/creators'
import { getSiteSettings } from '@/modules/site-settings/queries'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { BookingStatus, CancelBooking, type BookingStatusProps } from './components/BookingStatus'
import { QuotationView } from './components/QuotationView'
import { getMatchPage } from './match'
import type { QuotationAccess } from './queries'
import { idOf } from './rows'
import { matchView, quotationView } from './views'

/** The quotation page body shared by `/q/{ref}/{key}` and `/account/bookings/{ref}` (QM-US2, QM-US3). */
export async function QuotationPage({
  access,
  locale,
  keyParam,
  error,
  promo,
}: {
  access: QuotationAccess
  locale: Locale
  keyParam: string
  error?: string
  promo?: string
}) {
  const now = new Date()
  const [settings, ctx, all] = await Promise.all([
    getSiteSettings(locale),
    getDirectoryContext(locale),
    getTranslations({ locale }),
  ])
  let replacements: BookingStatusProps['replacements'] = []
  if (access.booking.state === 'accepted') {
    const payload = await getPayloadClient()
    const brief = await payload.findByID({
      collection: 'briefs',
      id: Number(idOf(access.booking.brief)),
      depth: 0,
      overrideAccess: true,
    })
    const page = await getMatchPage(brief, locale, now, { date: access.booking.date ?? null })
    const view = matchView(page, {
      ref: '',
      key: '',
      locale,
      picks: [],
      date: access.booking.date ?? null,
      ctx,
      settings,
      sentence: '',
    })
    replacements = view.sections.map((s) => ({
      personaId: s.personaId,
      type: s.singular,
      sentence: '',
      creators: s.creators.slice(0, 8),
    }))
  }
  const { view, status } = await quotationView(access, {
    locale,
    key: keyParam,
    now,
    settings,
    replacements,
    prefix: ctx.prefix,
  })
  const known = (key: string) => {
    try {
      return all(key as never)
    } catch {
      return all('booking.errors.generic')
    }
  }
  const notice = promo
    ? promo === 'applied'
      ? all('quote.promo.applied', { code: access.current.promoCode ?? '' })
      : known(`quote.promo.${promo}`)
    : null
  return (
    <section className="mx-auto max-w-[680px] px-3 pt-8 sm:pt-14 print:max-w-none print:p-0">
      <QuotationView
        {...view}
        notice={notice}
        error={
          error && /^(booking|availability)\.errors\.[\w-]+$/.test(error) ? known(error) : null
        }
        status={<BookingStatus {...status} />}
        endActions={
          status.canCancel ? (
            <CancelBooking access={status.access} label={all('quote.cancel')} />
          ) : null
        }
      />
    </section>
  )
}
