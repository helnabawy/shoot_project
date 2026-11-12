import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { LoginForm } from '@/modules/auth/components/LoginForm'
import { safeNext } from '@/modules/auth/safe-next'
import { getCurrentUser } from '@/modules/auth/session'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.otp' })
  return { title: t('emailTitle'), alternates: alternates('/login/email', locale as Locale), robots: { index: false } }
}

/** Email and password for editors and existing email members, with the same lockout (FR-061). */
export default async function EmailLoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { next } = await searchParams
  const destination = safeNext(next)
  if (await getCurrentUser()) redirect({ href: destination, locale })
  const t = await getTranslations('auth.otp')
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('emailTitle')}</h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{t('emailIntro')}</p>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
        <LoginForm locale={locale} next={destination} />
      </NextIntlClientProvider>
    </section>
  )
}

async function formMessages() {
  const all = (await getMessages()) as Record<string, unknown>
  return { auth: all.auth, nav: all.nav } as never
}
