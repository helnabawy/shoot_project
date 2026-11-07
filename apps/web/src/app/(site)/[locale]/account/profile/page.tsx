import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { requireUser } from '@/modules/auth/session'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { formatCode, getMyProfileView } from '@/modules/creators'
import { ProfileForm } from '@/modules/creators/components/ProfileForm'
import { SampleManager } from '@/modules/creators/components/SampleManager'
import { StatusBanner } from '@/modules/creators/components/StatusBanner'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'creators.form' })
  return { title: t('metaTitle'), robots: { index: false } }
}

export default async function MyProfilePage({ params }: Props) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account/profile')
  // Only professional accounts have a profile; everyone else gets the same page as any unknown address.
  if (user.accountType !== 'provider') notFound()

  const [t, view, settings, messages] = await Promise.all([
    getTranslations({ locale, namespace: 'creators.form' }),
    getMyProfileView(user, locale),
    getSiteSettings(locale),
    getMessages(),
  ])
  const { profile, options, defaults } = view
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
        <ProfileForm
          locale={locale}
          profile={profile}
          options={options}
          defaults={defaults}
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
    </section>
  )
}
