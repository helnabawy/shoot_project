import { normaliseCode } from '@shoot/domain/creators'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BriefBuilder } from '@/modules/brief/components/BriefBuilder'
import { configForCreator } from '@/modules/brief/creator'
import { getBriefBuilderConfig } from '@/modules/brief/queries'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { getCreatorProfile } from '@/modules/creators'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { briefLabels } from '@/shared/i18n/server-labels'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string; code: string }> }

// A booking page is a step in a flow, not a page to find in search.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function BookPage({ params }: Props) {
  const { locale: raw, code } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const normalised = normaliseCode(code)
  const page = normalised ? await getCreatorProfile(normalised, locale) : null
  // Only a creator who can be booked has a booking page; everyone else is a plain 404.
  if (!normalised || !page || !page.canBook) notFound()
  if (code !== normalised.toLowerCase())
    permanentRedirect(localizeHref(`/book/${normalised.toLowerCase()}`, locale))

  const [t, tb, builder, labels, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'creators.profile' }),
    getTranslations({ locale, namespace: 'creators.booking' }),
    getBriefBuilderConfig(locale),
    briefLabels(locale),
    getSiteSettings(locale),
  ])
  const scoped = builder ? configForCreator(builder, page.personaSlugs) : null
  if (!scoped) notFound()
  const { view } = page

  return (
    <section className="mx-auto max-w-[680px] px-3 pt-8 sm:pt-14">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">
        {t('bookTitle', { name: view.name })}
      </h1>
      <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{t('bookIntro')}</p>
      <div data-floating-hide>
        <BriefBuilder
          config={scoped.config}
          locked={scoped.locked}
          creator={{
            code: view.code,
            displayCode: page.displayCode,
            name: view.name,
            initials: view.initials,
            photo: view.photo,
            changeHref: localizeHref('/', locale),
            changeLabel: t('change'),
            prompt: tb('prompt'),
          }}
          whatsappHref={
            whatsappHref(settings.whatsappNumber, settings.whatsappDefaultMessage) ?? '#'
          }
          providerHref={localizeHref('/register?type=provider', locale)}
          sourcePath={localizeHref(`/book/${view.code.toLowerCase()}`, locale)}
          labels={labels}
        />
      </div>
    </section>
  )
}
