import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireUser } from '@/modules/auth/session'
import { getQuotationAccess } from '@/modules/booking/queries'
import { QuotationPage } from '@/modules/booking/quote-page'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string; ref: string }>; searchParams: Promise<{ error?: string; promo?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, ref } = await params
  const t = await getTranslations({ locale, namespace: 'quote' })
  return { title: t('metaTitle', { reference: ref.toUpperCase() }), robots: { index: false } }
}

/** A member's own quotation, without the private key (QM-US2-S6). */
export default async function MemberBookingPage({ params, searchParams }: Props) {
  const { locale: raw, ref } = await params
  const { error, promo } = await searchParams
  setRequestLocale(raw)
  const user = await requireUser(raw as Locale, `/account/bookings/${ref}`)
  const access = await getQuotationAccess(ref, null, user.id, raw === 'ar' ? 'ar' : 'en')
  if (!access) notFound()
  return <QuotationPage access={access} locale={raw as Locale} keyParam="" error={error} promo={promo} />
}
