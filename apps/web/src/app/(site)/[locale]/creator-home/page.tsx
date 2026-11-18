import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentUser } from '@/modules/auth/session'
import { webActor } from '@/modules/auth/web-actor'
import { buildHomeView, CreatorHome, creatorHome, declineKey, type HomeHrefs, type Words } from '@/modules/creator-home'
import { isProblem } from '@/shared/api/problem'
import { localizeHref } from '@/shared/i18n/href'
import { isLocale } from '@/shared/lib/locale'
import { LandingContent } from '../_landing/LandingContent'

/**
 * What a signed-in creator sees at `/` and `/ar` (feature 023). The proxy sends the creator's home address
 * here from the session token's account-type hint (research R1); the hint is not trusted: this page checks the
 * real session, and shows the landing to anyone who is not a creator after all. Visited directly it sends
 * anyone else to the home.
 */

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; decline?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = await getTranslations({ locale, namespace: 'creatorHome' })
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

export default async function CreatorHomePage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const user = await getCurrentUser()
  if (user?.accountType !== 'provider') {
    // The proxy swapped the home address for this page on a hint that turned out wrong: show the landing there.
    const asked = (await headers()).get('x-pathname')
    if (asked === '/' || asked === '/ar') return <LandingContent locale={locale} />
    redirect(localizeHref('/', locale))
  }

  const [{ error, decline }, t, steps, all, home] = await Promise.all([
    searchParams,
    getTranslations({ locale, namespace: 'creatorHome' }),
    getTranslations({ locale, namespace: 'creators.steps' }),
    getTranslations({ locale }),
    webActor(locale, user).then((actor) => creatorHome(actor)),
  ])
  if (isProblem(home)) throw new Error(home.code)

  const words: Words = {
    title: (v) => t('title', v),
    titleNoOccasion: (v) => t('titleNoOccasion', v),
    answerBy: (time) => t('answerBy', { time }),
    dateToAgree: t('dateToAgree'),
    sentAt: (relative) => relative,
    stepLabel: (step) => steps(step as never),
  }
  const hrefs: HomeHrefs = {
    home: localizeHref('/', locale),
    decline: (key) => `${localizeHref('/', locale)}?decline=${encodeURIComponent(key)}#answer`,
    bookings: localizeHref('/account/bookings', locale),
    booking: (ref) => localizeHref(`/account/bookings/${ref}`, locale),
    availability: localizeHref('/account/availability', locale),
    profile: localizeHref('/account/profile', locale),
    inbox: localizeHref('/account/inbox', locale),
  }
  const view = buildHomeView(home, locale, words, new Date())
  const errorText = error && /^(booking|inbox|offers|creators)\.errors\.[\w-]+$/.test(error) ? all(error as never) : null
  const open = view.card && decline === declineKey(view.card) ? decline : null

  return <CreatorHome view={view} locale={locale} hrefs={hrefs} error={errorText} declining={open} />
}
