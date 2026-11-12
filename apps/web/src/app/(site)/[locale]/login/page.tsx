import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { PhoneStep } from '@/modules/auth/components/PhoneStep'
import { safeNext } from '@/modules/auth/safe-next'
import { getCurrentUser } from '@/modules/auth/session'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; add?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('loginTitle'), alternates: alternates('/login', locale as Locale), robots: { index: false } }
}

/**
 * Sign in by number and code (feature 009, FR-060). The same steps create a client account. With
 * `?add=number`, a member signed in by email adds a sign-in number instead (FR-063).
 */
export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { next, add } = await searchParams
  const destination = safeNext(next)
  const user = await getCurrentUser()
  const linking = add === 'number' && user !== null && !user.username
  if (user && !linking) redirect({ href: destination, locale })
  const t = await getTranslations('auth')
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{linking ? t('otp.linkTitle') : t('loginTitle')}</h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{linking ? t('otp.linkIntro') : t('otp.loginIntro')}</p>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
        <PhoneStep locale={locale} next={linking ? '/account' : destination} mode={linking ? 'link' : 'login'} />
      </NextIntlClientProvider>
    </section>
  )
}

/** Only the namespaces the form needs travel to the browser. */
async function formMessages() {
  const all = (await getMessages()) as Record<string, unknown>
  return { auth: all.auth, nav: all.nav } as never
}
