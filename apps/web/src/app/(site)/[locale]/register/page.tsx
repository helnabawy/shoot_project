import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { PhoneStep } from '@/modules/auth/components/PhoneStep'
import { safeNext } from '@/modules/auth/safe-next'
import { getCurrentUser } from '@/modules/auth/session'
import { getLegalForRegistration } from '@/modules/legal'
import { getActivePersonas } from '@/modules/personas/queries'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; persona?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('otp.joinTitle'), alternates: alternates('/register', locale as Locale) }
}

/** Join as a creator by code (feature 009, FR-061): no page creates an account with email and password. */
export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { next, persona } = await searchParams
  const destination = safeNext(next)
  if (await getCurrentUser()) redirect({ href: destination, locale })
  const [t, personas, legal] = await Promise.all([getTranslations('auth'), getActivePersonas(locale as Locale), getLegalForRegistration(locale as Locale)])
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('otp.joinTitle')}</h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{t('otp.joinIntro')}</p>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
        <PhoneStep
          locale={locale}
          next={destination}
          mode="join"
          personas={personas.map((p) => ({ slug: p.slug, label: p.singular }))}
          initialPersona={persona}
          legal={legal}
        />
      </NextIntlClientProvider>
    </section>
  )
}

/** Only the namespaces the form needs travel to the browser. */
async function formMessages() {
  const all = (await getMessages()) as Record<string, unknown>
  return { auth: all.auth, nav: all.nav } as never
}
