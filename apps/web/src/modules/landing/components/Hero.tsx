import { interpolatePersonaCopy } from '@shoot/domain/personas'
import type { LandingPage, SiteSetting } from '@/payload-types'
import { BriefBuilder } from '@/modules/brief/components/BriefBuilder'
import type { BriefLabels } from '@/modules/brief/labels'
import type { BriefBuilderConfig } from '@/modules/brief/types'
import { whatsappHref } from '@/modules/contact/whatsapp'
import type { AudiencePersona } from '@/modules/personas/queries'
import { getImageProps } from 'next/image'
import type { Media } from '@/payload-types'
import { CmsImage, mediaSource } from '@/shared/components/CmsImage'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { cx } from '@/shared/ui/bar'
import type { Locale } from '@/shared/lib/locale'
import { StudioSet } from './StudioSet'

/** Phones (below `sm`) get the portrait crop when the CMS has one. */
const PHONE_MEDIA = '(max-width: 639px)'

const asMedia = (m: Media | number | null | undefined): Media | null => (m && typeof m === 'object' ? m : null)

/**
 * The stage photo. With a phone crop it is one `<picture>` (art direction), so each device
 * downloads, and preloads as its LCP image, only the file it shows.
 */
function StagePhoto({ photo, phone }: { photo: Media; phone: Media | null }) {
  const wide = mediaSource(photo, 'hero')
  const narrow = phone ? mediaSource(phone, 'card') : null
  if (!wide) return null
  const common = { alt: photo.alt ?? '', sizes: '100vw', priority: true }
  const {
    props: { srcSet: wideSet, ...img },
  } = getImageProps({ ...common, src: wide.url, width: wide.width, height: wide.height })
  const narrowSet = narrow
    ? getImageProps({ ...common, src: narrow.url, width: narrow.width, height: narrow.height }).props.srcSet
    : null
  return (
    <picture>
      {narrowSet ? <source media={PHONE_MEDIA} srcSet={narrowSet} /> : null}
      <source srcSet={wideSet} />
      <img {...img} alt={photo.alt ?? ''} className="size-full object-cover" />
    </picture>
  )
}

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
  const photo = asMedia(hero?.image)
  const phonePhoto = asMedia(hero?.imageMobile)
  const overlay = asMedia(hero?.overlay)
  const overlayOpacity = Math.min(100, Math.max(0, hero?.overlayOpacity ?? 8)) / 100
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
              <StagePhoto photo={photo} phone={phonePhoto} />
            ) : (
              <>
                <div className="studio-sweep absolute inset-0" />
                <StudioSet />
              </>
            )}
            {/* The CMS overlay (e.g. the UAE outline): its shape masks a fill in the text colour,
                so one file reads in light and dark. Decorative. */}
            {overlay?.url ? (
              <div
                aria-hidden="true"
                data-testid="hero-overlay"
                className="hero-overlay absolute inset-x-[4%] inset-y-[6%] bg-ink"
                style={{ ['--overlay-src' as string]: `url(${JSON.stringify(overlay.url)})`, opacity: overlayOpacity }}
              />
            ) : null}
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

      {/* Under the stage: the gap before the page grid. The trust chips are no longer shown here
          (owner, 2026-11-07); with the two-button layout the hero photo sits here instead. */}
      <div
        className={cx(
          'mx-auto max-w-[680px] px-4',
          useBuilder &&
            'flex flex-col gap-2.5 pt-4 sm:px-6 lg:max-w-[1080px] lg:flex-row lg:items-baseline lg:justify-between lg:gap-10 lg:pt-5',
        )}
      >
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
