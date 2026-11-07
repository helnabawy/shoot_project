import { interpolatePersonaCopy } from '@shoot/domain/personas'
import type { LandingPage, SiteSetting } from '@/payload-types'
import { BriefBuilder } from '@/modules/brief/components/BriefBuilder'
import type { BriefLabels } from '@/modules/brief/labels'
import type { BriefBuilderConfig } from '@/modules/brief/types'
import { whatsappHref } from '@/modules/contact/whatsapp'
import type { AudiencePersona } from '@/modules/personas/queries'
import { CmsImage } from '@/shared/components/CmsImage'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { cx } from '@/shared/ui/bar'
import type { Locale } from '@/shared/lib/locale'

/**
 * First viewport: a full-screen stage with the CMS headline as its title and the glass brief bar
 * beneath it, over the hero photo.
 * The bar's Top Hit stays above the fold on a 360 × 640 phone (FR-057).
 */
export function Hero({
  hero,
  builder,
  briefLabels,
  settings,
  personas,
  contact,
  locale,
}: {
  hero: LandingPage['hero']
  builder: BriefBuilderConfig | null
  briefLabels: BriefLabels
  settings: SiteSetting
  personas: AudiencePersona[]
  contact: ContactDetails
  locale: Locale
}) {
  const firstPersona = personas[0]
  const providerLabel = firstPersona
    ? interpolatePersonaCopy(
        settings.labels?.providerLabel || firstPersona.copy?.providerCta || '',
        firstPersona,
        { locale },
      )
    : undefined
  const useBuilder = hero?.layout !== 'ctas' && builder
  const chips = (hero?.trustChips ?? []).map((c) => c.text).filter(Boolean)

  const builderNode = useBuilder ? (
    <BriefBuilder
      config={builder}
      tone="glass"
      sourcePath={locale === 'en' ? '/' : `/${locale}`}
      whatsappHref={whatsappHref(settings.whatsappNumber, settings.whatsappDefaultMessage) ?? '#'}
      providerHref={`${locale === 'en' ? '' : `/${locale}`}/register?type=provider${firstPersona ? `&persona=${firstPersona.slug}` : ''}`}
      providerLabel={providerLabel}
      labels={briefLabels}
      quickMatch={settings.quickMatch?.enabled === true}
    />
  ) : null
  const photo = hero?.image && typeof hero.image === 'object' ? hero.image : null
  // The title sits on the stage above the bar, aligned to its edge. A soft halo in the ground colour
  // keeps it legible over a busy photo; on the studio sweep it is invisible.
  const title = (
    <h1
      id="hero-heading"
      className="px-1 text-[38px] font-bold leading-[1.02] tracking-[-0.03em] text-balance text-ink [text-shadow:0_0_28px_var(--ground)] sm:px-0 sm:text-[52px]"
    >
      {hero?.headline}
    </h1>
  )

  return (
    <section id="brief" aria-labelledby="hero-heading">
      {builderNode ? (
        /* The stage fills the screen under the header: the glass bar floats, centred, over the hero
           photo (or the empty-studio sweep until the CMS has one). An opened bar runs on past it. */
        <div className="relative isolate min-h-[calc(100svh-60px)]">
          <div
            aria-hidden={photo ? undefined : true}
            className={cx(
              'absolute inset-x-0 top-0 -z-10 h-[calc(100svh-60px)] overflow-hidden',
              photo && 'photo-scrim',
            )}
          >
            {photo ? (
              <CmsImage
                media={photo}
                size="hero"
                priority
                sizes="100vw"
                className="size-full object-cover"
              />
            ) : (
              <div className="studio-sweep absolute inset-0" />
            )}
          </div>
          <div className="mx-auto max-w-[680px] px-3 pt-[max(2rem,calc(50svh-200px))] pb-8 sm:px-4">
            {title}
            <div className="mt-5 sm:mt-6" data-floating-hide>
              {builderNode}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[680px] px-3 pt-5 sm:px-4 sm:pt-10">
          {title}
          <div className="-mx-2 mt-5 grid gap-1" data-floating-hide>
            <CtaLink cta={hero?.primaryCta} contact={contact} locale={locale} />
            <CtaLink
              cta={hero?.secondaryCta}
              contact={contact}
              locale={locale}
              variant="secondary"
            />
          </div>
        </div>
      )}

      {/* Under the stage, the first line of the page grid: the hint at the start, the promises at
          the end (one line from 1024 px, stacked on phones), each promise set off by a hairline. */}
      <div
        className={cx(
          'mx-auto max-w-[680px] px-4',
          useBuilder &&
            'flex flex-col gap-2.5 pt-4 sm:px-6 lg:max-w-[1080px] lg:flex-row lg:items-baseline lg:justify-between lg:gap-10 lg:pt-5',
        )}
      >
        {chips.length ? (
          <ul
            className={cx(
              // Stacked on phones so no line starts with a rule; one line divided by hairlines from 640 px.
              'flex flex-col gap-1.5 text-[13px] font-medium text-mute sm:flex-row sm:flex-wrap sm:[&>li+li]:ms-3 sm:[&>li+li]:border-s sm:[&>li+li]:border-hair sm:[&>li+li]:ps-3',
              useBuilder ? 'lg:shrink-0' : 'mt-3',
            )}
          >
            {chips.map((chip) => (
              <li key={chip} className="leading-none">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        {!useBuilder && photo ? (
          <div className="mt-8 overflow-hidden rounded-[var(--radius-panel)]">
            <CmsImage
              media={photo}
              size="hero"
              sizes="(max-width: 768px) 100vw, 680px"
              className="h-auto w-full"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
