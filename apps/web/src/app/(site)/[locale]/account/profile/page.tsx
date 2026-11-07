import { dubaiToday } from '@shoot/domain/booking'
import { STEP_NUMBER } from '@shoot/domain/creators'
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
import { ProfileOverview, ProfileStepsProvider, StepPanel } from '@/modules/creators/components/ProfileStepper'
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
  const { profile, identity, options, defaults, missing, strength } = view
  const dayStatus = new Map((availability?.blocks ?? []).map((b) => [b.date, b.kind === 'booking' ? 'booked' : 'blocked'] as const))
  const blocked = [...dayStatus.values()].filter((v) => v === 'blocked').length
  const calendarError = error && /^availability\.errors\.[\w-]+$/.test(error) ? all(error as never) : null
  const displayCode = profile?.code ? await formatCode(profile.code, locale) : null
  const publicNow = profile && (profile.status === 'live' || profile.status === 'live-with-changes')
  const chosen = new Set(profile?.specialties ?? defaults.specialties)

  return (
    <section className="mx-auto max-w-[1040px] px-3 pt-8 pb-8 sm:pt-14" data-floating-hide>
      <NextIntlClientProvider locale={locale} messages={{ creators: (messages as { creators: unknown }).creators } as never}>
        <ProfileStepsProvider initial={calendarError ? 'calendar' : 'basics'}>
          <h1 className="mb-5 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
          {/* Phones: status, meter, sticky tabs, the open step. From 1024 px: meter and tabs in a sticky column beside status and step. */}
          <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:[grid-template-areas:'side_status'_'side_main']">
            <div className="lg:[grid-area:status]">
              <StatusBanner
                status={profile?.status ?? 'draft'}
                autoPublish={Boolean(profile?.autoPublish)}
                reviewNote={profile?.reviewNote ?? ''}
                displayCode={displayCode}
                viewHref={publicNow && profile ? localizeHref(`/creators/${profile.code.toLowerCase()}`, locale) : null}
                whatsappHref={whatsappHref(settings.whatsappNumber, settings.whatsappDefaultMessage)}
                locale={locale}
              />
            </div>
            {/* `contents` below 1024 px lets the tab strip stick to the whole page, not to this column. */}
            <aside className="max-lg:contents lg:sticky lg:top-24 lg:self-start lg:[grid-area:side]">
              <div className="max-lg:contents">
                <ProfileOverview
                  percent={strength.percent}
                  steps={strength.steps}
                  status={profile?.status ?? 'draft'}
                  identity={{ 'emirates-id': identity['emirates-id'].state, 'trade-license': identity['trade-license'].state }}
                  links={profile?.social.length ?? 0}
                  samples={profile?.samples.length ?? 0}
                  blocked={blocked}
                />
              </div>
            </aside>
            <div id="profile-panels" className="mt-8 min-w-0 scroll-mt-36 lg:[grid-area:main] lg:max-w-[640px] lg:scroll-mt-24">
              <ProfileForm
                locale={locale}
                missing={missing}
                profile={profile}
                options={options}
                defaults={defaults}
                after={
                  <>
                    <StepPanel step="calendar">
                      <section className="mt-12" aria-labelledby="sec-calendar" data-testid="section-calendar">
                        <SectionHeading id="sec-calendar" step={STEP_NUMBER.calendar}>{tc('title')}</SectionHeading>
                        <p className="mt-1 px-1 text-[15px] text-mute">{availability ? tc('intro') : tc('needsProfile')}</p>
                        {availability ? <ProfileCalendar months={calendarMonths(today, CALENDAR_DAYS, dayStatus)} locale={locale} blocked={blocked} error={calendarError} /> : null}
                      </section>
                    </StepPanel>
                    <StepPanel step="identity">
                      <section className="mt-12" aria-labelledby="sec-identity" data-testid="section-identity">
                        <SectionHeading id="sec-identity" step={STEP_NUMBER.identity}>{all('creators.identity.title')}</SectionHeading>
                        <IdentitySection identity={identity} locale={locale} />
                      </section>
                    </StepPanel>
                  </>
                }
                samples={
                  <StepPanel step="samples">
                    <SampleManager
                      locale={locale}
                      samples={profile?.samples ?? []}
                      specialties={options.specialties.filter((s) => chosen.has(s.id)).map((s) => ({ id: s.id, name: s.name }))}
                      hasProfile={Boolean(profile)}
                    />
                  </StepPanel>
                }
              />
            </div>
          </div>
        </ProfileStepsProvider>
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
