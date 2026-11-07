import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { RegisterForm } from '@/modules/auth/components/RegisterForm'
import { safeNext } from '@/modules/auth/safe-next'
import { getCurrentUser } from '@/modules/auth/session'
import { getLegalForRegistration } from '@/modules/legal'
import { getActivePersonas } from '@/modules/personas/queries'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; type?: string; persona?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('registerTitle'), alternates: alternates('/register', locale as Locale) }
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { next, type, persona } = await searchParams
  const destination = safeNext(next)
  if (await getCurrentUser()) redirect({ href: destination, locale })
  const [t, personas, legal] = await Promise.all([getTranslations('auth'), getActivePersonas(locale as Locale), getLegalForRegistration(locale as Locale)])
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('registerTitle')}</h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{t('registerIntro')}</p>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
      <RegisterForm
        locale={locale}
        next={destination}
        personas={personas.map((p) => ({ slug: p.slug, label: p.singular }))}
        initialType={type === 'provider' ? 'provider' : 'seeker'}
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
