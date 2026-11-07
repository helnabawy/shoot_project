import { dubaiToday } from '@shoot/domain/booking'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { getLegalForRegistration } from '@/modules/legal'
import { requireUser } from '@/modules/auth/session'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { calendarMonths } from '@/modules/booking/calendar'
import { getMyAvailability } from '@/modules/booking/queries'
import { formatCode, getMyProfileView } from '@/modules/creators'
import { IdentitySection } from '@/modules/creators/components/IdentitySection'
import { ProfileCalendar } from '@/modules/creators/components/ProfileCalendar'
import { ProfileForm } from '@/modules/creators/components/ProfileForm'
import { ProfileSteps, STEP_NUMBER } from '@/modules/creators/components/ProfileSteps'
import { SampleManager } from '@/modules/creators/components/SampleManager'
import { SectionHeading } from '@/modules/creators/components/SectionHeading'
import { StatusBanner } from '@/modules/creators/components/StatusBanner'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }

/** The calendar's window: the same 90 days as the availability list (FR-002). */
const CALENDAR_DAYS = 90

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'creators.form' })
  return { title: t('metaTitle'), robots: { index: false } }
}

export default async function MyProfilePage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const { error } = await searchParams
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account/profile')
  // Only professional accounts have a profile; everyone else gets the same page as any unknown address.
  if (user.accountType !== 'provider') notFound()

  const today = dubaiToday(new Date())
  const [t, tl, tc, all, view, settings, messages, legal, availability] = await Promise.all([
    getTranslations({ locale, namespace: 'creators.form' }),
    getTranslations({ locale, namespace: 'legal' }),
    getTranslations({ locale, namespace: 'creators.calendar' }),
    getTranslations({ locale }),
    getMyProfileView(user, locale),
    getSiteSettings(locale),
    getMessages(),
    getLegalForRegistration(locale),
    getMyAvailability(user, today),
  ])
  const professionalTerms = legal['professional-terms']
  const { profile, identity, options, defaults, missing } = view
  const dayStatus = new Map((availability?.blocks ?? []).map((b) => [b.date, b.kind === 'booking' ? 'booked' : 'blocked'] as const))
  const blocked = [...dayStatus.values()].filter((v) => v === 'blocked').length
  const calendarError = error && /^availability\.errors\.[\w-]+$/.test(error) ? all(error as never) : null
  const displayCode = profile?.code ? await formatCode(profile.code, locale) : null
  const publicNow = profile && (profile.status === 'live' || profile.status === 'live-with-changes')
  const chosen = new Set(profile?.specialties ?? defaults.specialties)

  return (
    <section className="mx-auto max-w-[560px] px-3 pt-8 pb-8 sm:pt-14" data-floating-hide>
      <NextIntlClientProvider locale={locale} messages={{ creators: (messages as { creators: unknown }).creators } as never}>
        <h1 className="mb-5 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
        <StatusBanner
          status={profile?.status ?? 'draft'}
          autoPublish={Boolean(profile?.autoPublish)}
          reviewNote={profile?.reviewNote ?? ''}
          displayCode={displayCode}
          viewHref={publicNow && profile ? localizeHref(`/creators/${profile.code.toLowerCase()}`, locale) : null}
          whatsappHref={whatsappHref(settings.whatsappNumber, settings.whatsappDefaultMessage)}
          locale={locale}
        />
        <ProfileSteps
          missing={missing}
          status={profile?.status ?? 'draft'}
          samples={profile?.samples.length ?? 0}
          links={profile?.social.length ?? 0}
          blocked={blocked}
          identity={identity}
        />
        <ProfileForm
          locale={locale}
          missing={missing}
          profile={profile}
          options={options}
          defaults={defaults}
          after={
            <>
              <section className="mt-12" aria-labelledby="sec-calendar" data-testid="section-calendar">
                <SectionHeading id="sec-calendar" step={STEP_NUMBER.calendar}>{tc('title')}</SectionHeading>
                <p className="mt-1 px-1 text-[15px] text-mute">{availability ? tc('intro') : tc('needsProfile')}</p>
                {availability ? <ProfileCalendar months={calendarMonths(today, CALENDAR_DAYS, dayStatus)} locale={locale} blocked={blocked} error={calendarError} /> : null}
              </section>
              <section className="mt-12" aria-labelledby="sec-identity" data-testid="section-identity">
                <SectionHeading id="sec-identity" step={STEP_NUMBER.identity}>{all('creators.identity.title')}</SectionHeading>
                <IdentitySection identity={identity} locale={locale} />
              </section>
            </>
          }
          samples={
            <SampleManager
              locale={locale}
              samples={profile?.samples ?? []}
              specialties={options.specialties.filter((s) => chosen.has(s.id)).map((s) => ({ id: s.id, name: s.name }))}
              hasProfile={Boolean(profile)}
            />
          }
        />
      </NextIntlClientProvider>
      {professionalTerms ? (
        <p className="mt-6 px-1 text-[14px] text-mute" data-testid="professional-terms-note">
          {tl('professionalNote')}{' '}
          <Link href={localizeHref(professionalTerms.href, locale)} className="font-medium text-ink underline">
            {professionalTerms.label}
          </Link>
        </p>
      ) : null}
    </section>
  )
}
