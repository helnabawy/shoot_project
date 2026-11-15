import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { KeptBrief } from '@/modules/auth/components/KeptBrief'
import { PhoneStep } from '@/modules/auth/components/PhoneStep'
import { readKept } from '@/modules/brief/kept-cookie'
import { BRIEF_SEND_PATH } from '@/modules/brief/paths'
import { safeNext } from '@/modules/auth/safe-next'
import { getCurrentUser } from '@/modules/auth/session'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

/** A quotation's private page (`/q/{ref}/{key}`), the only place an `accept` sign-in returns to. */
const QUOTE_PATH = /^\/q\/[\w-]+\/[\w-]+$/

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; add?: string; for?: string }> }

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
  const { next, add, for: purpose } = await searchParams
  const destination = safeNext(next)
  const user = await getCurrentUser()
  const linking = add === 'number' && user !== null && !user.username
  if (user && !linking) redirect({ href: destination, locale })
  // 021: from a guest's brief, with the brief still kept, this sign-in sends it.
  const kept = !linking && purpose === 'brief' ? await readKept(new Date()) : null
  // 021 amendment (BS-US7-S2): from a quotation's Accept, this sign-in returns to the quotation.
  const accepting = !linking && !kept && purpose === 'accept' && QUOTE_PATH.test(destination)
  const t = await getTranslations('auth')
  const title = linking ? t('otp.linkTitle') : kept ? t('otp.briefTitle') : accepting ? t('otp.acceptTitle') : t('loginTitle')
  const intro = linking ? t('otp.linkIntro') : kept ? t('otp.briefIntro') : accepting ? t('otp.acceptIntro') : t('otp.loginIntro')
  return (
    <section className="mx-auto max-w-[480px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-balance text-ink">{title}</h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{intro}</p>
      <NextIntlClientProvider locale={locale} messages={await formMessages()}>
        <PhoneStep
          locale={locale}
          next={linking ? '/account' : kept ? BRIEF_SEND_PATH : destination}
          mode={linking ? 'link' : 'login'}
          intent={kept ? 'brief' : accepting ? 'accept' : undefined}
          lead={
            kept ? (
              <KeptBrief sentence={kept.sentence} sentenceLocale={kept.locale} href={kept.path} label={t('otp.briefLabel')} changeLabel={t('otp.briefChange')} />
            ) : undefined
          }
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
