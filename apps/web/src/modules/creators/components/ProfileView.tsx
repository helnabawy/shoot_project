import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { Bidi } from '@/shared/ui/Bidi'
import { BriefBar, ResultGroup, ResultRow, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { CheckIcon, ClockIcon, FlagIcon, ForwardIcon, GlobeIcon, ImageIcon, PinIcon, TagIcon, UserIcon, WhatsAppIcon } from '@/shared/ui/icons'
import type { ProfileView as Profile } from '../profile'
import { PhotoTile } from './PhotoTile'
import { SampleGallery } from './SampleGallery'
import { SampleViewer } from './SampleViewer'

/**
 * A fact as one 44 px row: the value, and what it is in the trailing slot ("Works in"). Only the facts
 * that decide a booking (verified, types, shoots, places) come before the Top Hit, which keeps it above
 * the fold on a 360 × 640 phone; languages, experience and nationality follow it under "About". The
 * verified row alone carries a second line, because what "verified" means is the one claim the visitor
 * must be able to read.
 */
function Fact({ icon, value, label, note }: { icon: ReactNode; value: string; label?: string; note?: string }) {
  return (
    <ResultRow
      glyph={icon}
      label={
        note ? (
          <>
            <span className="block">{value}</span>
            <span className="block text-[13px] font-normal text-mute">{note}</span>
          </>
        ) : (
          value
        )
      }
      trailing={label}
    />
  )
}

/**
 * A creator's public profile (surface brief creator-profile), framed like the account home: from 1024 px a
 * start column holds the one panel that is the creator (photo, name, code, the deciding facts, the Top Hit
 * that books them, then "About"), and the wide end column is theirs to show: the bio, then the work at two
 * large columns. Phones keep one column: panel, bio, work, with a row in the panel that jumps to the work.
 */
export function ProfileView({
  view,
  displayCode,
  canBook,
  bookHref,
  askHref,
}: {
  view: Profile
  displayCode: string
  canBook: boolean
  bookHref: string
  askHref: string
}) {
  const t = useTranslations('creators.profile')
  const images = view.samples.filter((s) => s.kind === 'image')
  const hasAbout = view.languages.length > 0 || view.yearsExperience != null || Boolean(view.nationality)
  return (
    <div
      className="mx-auto grid max-w-[680px] gap-y-8 px-3 pt-8 pb-24 sm:pt-14 sm:pb-16 lg:max-w-[1080px] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-x-16 lg:px-6"
      data-testid="profile"
    >
      {/* pb-24 on phones: room under the last tile for the floating WhatsApp button. The panel holds still
          beside the work only where the viewport is tall enough to show all of it. */}
      <div className="lg:col-start-1 lg:row-start-1 lg:self-start lg:[@media(min-height:52rem)]:sticky lg:[@media(min-height:52rem)]:top-24">
        <BriefBar as="section" aria-labelledby="creator-name" data-testid="profile-header" data-floating-hide>
          <header className="flex items-center gap-4 border-b border-hair px-4 pt-4 pb-3">
            <PhotoTile photo={view.photo} initials={view.initials} size="lg" />
            <div className="min-w-0">
              <h1 id="creator-name" className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink text-balance break-words sm:text-[30px]">
                {view.name}
              </h1>
              <p data-testid="profile-code" className="mt-0.5 text-[13px] text-mute tabular-nums">
                <Bidi>{displayCode}</Bidi>
              </p>
            </div>
          </header>

          <div className="py-1">
            <div data-testid="badge-verified">
              <Fact icon={<CheckIcon width={16} height={16} />} value={t('verified')} note={t('verifiedHelp')} />
            </div>
            {view.types ? <Fact icon={<UserIcon width={16} height={16} />} value={view.types} label={t('types')} /> : null}
            {view.specialties.length ? <Fact icon={<TagIcon width={16} height={16} />} value={view.specialties.join(' · ')} label={t('shoots')} /> : null}
            {view.places.length ? <Fact icon={<PinIcon width={16} height={16} />} value={view.places.join(' · ')} label={t('places')} /> : null}
          </div>

          <div className="border-t border-hair pt-1 pb-2">
            <ResultGroup label={t('topHit')} className="pb-1">
              {canBook ? (
                <TopHit label={t('book', { name: view.name })} href={bookHref} testId="profile-book" />
              ) : (
                <TopHit label={t('ask')} href={askHref} external glyph={<WhatsAppIcon width={16} height={16} />} testId="profile-ask-whatsapp" />
              )}
            </ResultGroup>
            {canBook || view.social.length || view.samples.length ? (
              <ResultGroup label={t('actions')} className="pt-1">
                {/* Phones only: the work sits under the panel, so the panel points at it. */}
                {view.samples.length ? (
                  <a href="#work" className={`${rowClass('open')} lg:hidden`} data-testid="profile-see-work">
                    <RowContent glyph={<ImageIcon width={16} height={16} />} label={t('seeWork')} trailing={t('workCount', { count: view.samples.length })} />
                  </a>
                ) : null}
                {canBook ? (
                  <a href={askHref} target="_blank" rel="noopener noreferrer" className={rowClass('open')} data-testid="profile-ask-whatsapp">
                    <RowContent glyph={<WhatsAppIcon width={16} height={16} />} label={t('ask')} />
                  </a>
                ) : null}
                {view.social.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener nofollow ugc" className={rowClass('open')} data-testid="profile-social">
                    <RowContent glyph={<ForwardIcon width={15} height={15} />} label={t(`social.${s.platform}` as never)} />
                  </a>
                ))}
              </ResultGroup>
            ) : null}
          </div>

          {/* Who they are rather than what they do: after the booking, so the Top Hit holds the fold. */}
          {hasAbout ? (
            <div className="border-t border-hair pt-1 pb-2" data-testid="profile-about">
              <ResultGroup label={t('about')}>
                {view.languages.length ? <Fact icon={<GlobeIcon width={16} height={16} />} value={view.languages.join(' · ')} label={t('languages')} /> : null}
                {view.yearsExperience != null ? <Fact icon={<ClockIcon width={16} height={16} />} value={t('experienceYears', { count: view.yearsExperience })} label={t('experience')} /> : null}
                {view.nationality ? <Fact icon={<FlagIcon width={16} height={16} />} value={view.nationality} label={t('nationality')} /> : null}
              </ResultGroup>
            </div>
          ) : null}
        </BriefBar>
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        {view.bio ? (
          <p data-testid="profile-bio" className="max-w-[60ch] px-1 whitespace-pre-line text-[15px] leading-relaxed text-pretty text-ink lg:text-[17px] lg:leading-[1.6]">
            {view.bio}
          </p>
        ) : null}

        <section id="work" aria-labelledby="work-title" className={`scroll-mt-24 ${view.bio ? 'mt-12 lg:mt-14' : 'mt-4 lg:mt-0'}`}>
          <div className="flex items-baseline justify-between gap-4 px-1 pb-4">
            <h2 id="work-title" className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-balance text-ink sm:text-[30px]">
              {t('work')}
            </h2>
            {view.samples.length ? (
              <p className="text-[13px] text-mute tabular-nums [&:lang(ar)]:text-[14px]" data-testid="profile-work-count">
                {t('workCount', { count: view.samples.length })}
              </p>
            ) : null}
          </div>
          {view.samples.length ? (
            <SampleViewer
              samples={images.map((s) => ({ ...s.large, alt: s.alt, caption: s.caption, specialty: s.specialty }))}
              labels={{ label: t.raw('viewer.label') as string, close: t('viewer.close'), previous: t('viewer.previous'), next: t('viewer.next') }}
            >
              <SampleGallery samples={view.samples} />
            </SampleViewer>
          ) : (
            <div data-testid="profile-awaiting-samples" className="-mx-3 border-y border-hair py-1 lg:mx-0">
              <ResultRow glyph={<ImageIcon width={16} height={16} />} label={t('noSamples', { name: view.name })} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

