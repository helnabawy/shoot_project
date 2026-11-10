import { interpolatePersonaCopy } from '@shoot/domain/personas'
import { useTranslations } from 'next-intl'
import type { LandingPage, SiteSetting } from '@/payload-types'
import { BriefBuilder } from '@/modules/brief/components/BriefBuilder'
import type { BriefLabels } from '@/modules/brief/labels'
import type { BriefBuilderConfig } from '@/modules/brief/types'
import type { CreatorListItem } from '@/modules/creators'
import { whatsappHref } from '@/modules/contact/whatsapp'
import type { AudiencePersona } from '@/modules/personas/queries'
import { getImageProps } from 'next/image'
import type { Media } from '@/payload-types'
import { CmsImage, mediaSource } from '@/shared/components/CmsImage'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { cx } from '@/shared/ui/bar'
import type { Locale } from '@/shared/lib/locale'
import { HERO_CREATORS_MIN, HeroCreators } from './HeroCreators'
import { LensHud, LensScene } from './LensScene'
import { MotionToggle } from './MotionToggle'

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
 * First viewport (design 03 · Landing · desktop 1440, boards 01 and 02 for phones): a full-screen stage
 * with the CMS headline as its title, the subheadline under it and the glass brief bar beneath, over
 * the hero photo or, until there is one, the lens-and-timeline scene with its camera readout. Phones
 * leave room between the words and the bar for the lens; from 1024 px the column holds to the start
 * side, and from 1280 px real creators pass in two columns on the end side. One Pause control stops
 * every loop on the page.
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
  creators = [],
}: {
  hero: LandingPage['hero']
  builder: BriefBuilderConfig | null
  briefLabels: BriefLabels
  settings: SiteSetting
  personas: AudiencePersona[]
  contact: ContactDetails
  locale: Locale
  /** Listed creators for the hero columns; the columns show only with enough of them. */
  creators?: CreatorListItem[]
}) {
  const t = useTranslations('home.hero')
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
  // keeps it legible over a busy photo; on the drawn scene it is invisible.
  const title = (
    <h1
      id="hero-heading"
      className="px-1 text-[46px] font-bold leading-none tracking-[-0.035em] text-balance text-ink [text-shadow:0_0_28px_var(--ground)] sm:px-0 sm:text-[52px] lg:text-[76px] lg:leading-[0.98] xl:text-[96px] xl:tracking-[-0.04em]"
    >
      {hero?.headline}
    </h1>
  )
  const subheadline = hero?.subheadline ? (
    <p className="mt-3.5 max-w-[270px] px-1 text-[16px] leading-[1.45] text-pretty text-ink/80 [text-shadow:0_0_20px_var(--ground)] sm:max-w-[460px] sm:px-0 sm:text-[18px] lg:mt-5 lg:text-[20px]">
      {hero.subheadline}
    </p>
  ) : null
  const showCreators = creators.length >= HERO_CREATORS_MIN
  // Something loops on the stage (the key light, the creator columns), so it carries the Pause control.
  const loops = !photo || showCreators

  return (
    <section id="brief" aria-labelledby="hero-heading">
      {builderNode ? (
        /* The stage fills the screen under the header: the glass bar floats over the hero photo (or
           the lens scene until the CMS has one). An opened bar runs on past it. */
        <div className="relative isolate min-h-[calc(100svh-60px)]">
          <div
            aria-hidden={photo ? undefined : true}
            className={cx(
              'absolute inset-x-0 top-0 -z-10 h-[calc(100svh-60px)] overflow-hidden',
              photo && 'photo-scrim',
            )}
          >
            {photo ? <StagePhoto photo={photo} phone={phonePhoto} /> : <LensScene />}
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
          <div className="mx-auto grid max-w-[1440px] px-3 sm:px-4 lg:px-12 xl:grid-cols-[minmax(0,640px)_456px] xl:justify-between xl:gap-8 xl:px-16 min-[1440px]:px-24">
            {/* Phones: title, subheadline, the readout, then the bar, with the lens beside the readout.
                From 768 px the readout leads, as on the wide board. */}
            <div className="mx-auto flex w-full max-w-[680px] flex-col pt-[clamp(1rem,6svh,4rem)] pb-8 md:pt-12 lg:mx-0 lg:max-w-[640px] lg:pt-6">
              {photo ? null : (
                <LensHud className="max-md:order-1 max-md:mt-[clamp(1.25rem,5svh,2.5rem)] px-1 sm:px-0 md:mb-4" />
              )}
              {title}
              {subheadline}
              <div
                className={cx(
                  'md:mt-6 lg:mt-9 lg:max-w-[620px] max-md:order-2',
                  photo ? 'mt-5 sm:mt-6' : 'mt-[clamp(4.5rem,14svh,8rem)]',
                )}
                data-floating-hide
              >
                {builderNode}
              </div>
            </div>
            {showCreators ? (
              <HeroCreators
                items={creators}
                label={t('creators')}
                className="hidden h-[calc(100svh-60px)] self-start xl:flex"
              />
            ) : null}
          </div>
          {loops ? (
            <MotionToggle
              pauseLabel={t('pauseMotion')}
              playLabel={t('playMotion')}
              className="absolute bottom-6 inset-e-6 z-10 hidden lg:grid xl:inset-e-3 min-[1440px]:inset-e-6"
            />
          ) : null}
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
