import { maskPhone } from '@shoot/domain/auth'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { CodeStep } from '@/modules/auth/components/CodeStep'
import { readPending } from '@/modules/auth/pending'
import { getLegalForRegistration } from '@/modules/legal'
import { getActivePersonas } from '@/modules/personas/queries'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.otp' })
  return { title: t('codeTitle'), robots: { index: false } }
}

/** The code step (FR-060): reached only with a pending challenge (the HTTP-only `shoot-otp` cookie). */
export default async function CodePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const pending = await readPending()
  if (!pending) redirect({ href: '/login', locale })
  const p = pending!
  const [t, personas, legal] = await Promise.all([
    getTranslations('auth.otp'),
    p.mode === 'login' ? getActivePersonas(locale as Locale) : Promise.resolve([]),
    p.mode === 'login' ? getLegalForRegistration(locale as Locale) : Promise.resolve(undefined),
  ])
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="mb-2 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('codeTitle')}</h1>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
        <CodeStep
          locale={locale}
          phone={maskPhone(p.phone)}
          channel={p.channel}
          resendAt={p.resendAt}
          mode={p.mode}
          personas={personas.map((x) => ({ slug: x.slug, label: x.singular }))}
          legal={legal}
        />
      </NextIntlClientProvider>
    </section>
  )
}

async function formMessages() {
  const all = (await getMessages()) as Record<string, unknown>
  return { auth: all.auth, nav: all.nav } as never
}
