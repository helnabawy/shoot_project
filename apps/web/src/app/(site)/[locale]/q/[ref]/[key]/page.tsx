import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentUser } from '@/modules/auth/session'
import { getQuotationAccess } from '@/modules/booking/queries'
import { QuotationPage } from '@/modules/booking/quote-page'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string; ref: string; key: string }>; searchParams: Promise<{ error?: string; promo?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, ref } = await params
  const t = await getTranslations({ locale, namespace: 'quote' })
  return { title: t('metaTitle', { reference: ref.toUpperCase() }), robots: { index: false, follow: false } }
}

/** A quotation and its booking behind the client's private link (FR-011). */
export default async function QuotePage({ params, searchParams }: Props) {
  const { locale: raw, ref, key } = await params
  const { error, promo } = await searchParams
  setRequestLocale(raw)
  const user = await getCurrentUser()
  const access = await getQuotationAccess(ref, key, user?.id, raw === 'ar' ? 'ar' : 'en')
  if (!access) notFound()
  return <QuotationPage access={access} locale={raw as Locale} keyParam={key} error={error} promo={promo} />
}
