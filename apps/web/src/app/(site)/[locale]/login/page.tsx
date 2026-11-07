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
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('loginTitle'), alternates: alternates('/login', locale as Locale), robots: { index: false } }
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { next } = await searchParams
  const destination = safeNext(next)
  if (await getCurrentUser()) redirect({ href: destination, locale })
  const t = await getTranslations('auth')
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('loginTitle')}</h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{t('loginIntro')}</p>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
        <LoginForm locale={locale} next={destination} />
      </NextIntlClientProvider>
    </section>
  )
}

/** Only the namespaces the form needs travel to the browser. */
async function formMessages() {
  const all = (await getMessages()) as Record<string, unknown>
  return { auth: all.auth, nav: all.nav } as never
}
