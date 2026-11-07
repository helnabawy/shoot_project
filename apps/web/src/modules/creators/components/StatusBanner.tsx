import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { ProfileStatus } from '@shoot/domain/creators'
import { Bidi } from '@/shared/ui/Bidi'
import { BriefBar, ResultRow, RowContent, rowClass } from '@/shared/ui/bar'
import { CalendarIcon, CheckIcon, CloseIcon, ForwardIcon, GlobeIcon, TagIcon, UserIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { setProfileActive } from '../actions'
import { ActionForm } from './ActionForm'

const STATE_ICON: Record<ProfileStatus, React.ReactNode> = {
  draft: <UserIcon width={15} height={15} />,
  'in-review': <CalendarIcon width={15} height={15} />,
  live: <CheckIcon width={15} height={15} />,
  'live-with-changes': <CalendarIcon width={15} height={15} />,
  paused: <CloseIcon width={15} height={15} />,
  suspended: <CloseIcon width={15} height={15} />,
}

const KEY: Record<ProfileStatus, { title: string; body: string }> = {
  draft: { title: 'draft', body: 'bodyDraft' },
  'in-review': { title: 'inReview', body: 'bodyInReview' },
  live: { title: 'live', body: 'bodyLive' },
  'live-with-changes': { title: 'liveWithChanges', body: 'bodyLiveWithChanges' },
  paused: { title: 'paused', body: 'bodyPaused' },
  suspended: { title: 'suspended', body: 'bodySuspended' },
}

/**
 * What the public sees of this profile, in one row and one sentence, with the admin's note and the
 * few things a provider can do about it (surface brief provider-profile). One of the page's two panels.
 */
export function StatusBanner({
  status,
  autoPublish,
  reviewNote,
  displayCode,
  viewHref,
  whatsappHref,
  locale,
}: {
  status: ProfileStatus
  autoPublish: boolean
  reviewNote: string
  displayCode: string | null
  /** The public profile, when there is one to see. */
  viewHref: string | null
  whatsappHref: string | null
  locale: string
}) {
  const t = useTranslations('creators.status')
  const key = KEY[status]
  const body = status === 'live' && autoPublish ? 'bodyLiveAuto' : key.body
  const attention = status === 'paused' || status === 'suspended'
  const canPause = status === 'live' || status === 'live-with-changes'
  return (
    <BriefBar size="sm" data-testid="profile-status" data-status={status}>
      <div className="py-1.5">
        <ResultRow
          glyph={STATE_ICON[status]}
          label={
            <>
              <span className="block font-semibold">{t(key.title as never)}</span>
              <span className="block text-[13px] font-normal text-mute">{t(body as never)}</span>
            </>
          }
          state={status === 'live' ? 'set' : attention ? 'attention' : 'open'}
        />
        {reviewNote ? (
          <div role="note" data-testid="profile-review-note" className="mx-4 mb-1 mt-1 rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention">
            <span className="block text-[12px] font-semibold">{t('reviewNote')}</span>
            {reviewNote}
          </div>
        ) : null}
        {displayCode ? (
          <ResultRow glyph={<TagIcon width={15} height={15} />} label={t('code')} trailing={<Bidi>{displayCode}</Bidi>} />
        ) : null}
      </div>
      {viewHref || canPause || status === 'paused' || status === 'suspended' ? (
        <div className="border-t border-hair py-1">
          {viewHref ? (
            <Link href={viewHref} className={rowClass('open')} data-testid="profile-view-public">
              <RowContent glyph={<ForwardIcon width={15} height={15} />} label={t('view')} />
            </Link>
          ) : null}
          {status === 'paused' ? (
            <ActionForm action={setProfileActive} fields={{ locale, active: 'true' }} buttonClass={`${rowClass('open')} w-[calc(100%-12px)] text-start`} testId="profile-pause">
              <RowContent glyph={<GlobeIcon width={15} height={15} />} label={t('resume')} />
            </ActionForm>
          ) : null}
          {canPause ? (
            // Hiding asks once, in place and without a modal; a native disclosure, so it also works without JavaScript.
            <details className="group/pause" data-testid="profile-pause-details">
              <summary className={`${rowClass('open')} w-[calc(100%-12px)] cursor-pointer list-none text-start [&::-webkit-details-marker]:hidden`} data-testid="profile-pause">
                <RowContent glyph={<CloseIcon width={15} height={15} />} label={t('pause')} />
              </summary>
              <div className="px-4 pb-2">
                <p className="text-[14px] text-ink">{t('pauseConfirm')}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <ActionForm action={setProfileActive} fields={{ locale, active: 'false' }} buttonClass="inline-flex min-h-11 items-center rounded-[var(--radius-row)] bg-tile px-4 text-[15px] font-semibold text-ink hover:bg-ink/[0.08] focus-visible:outline-2 focus-visible:outline-[var(--focus)]" testId="profile-pause-confirm">
                    {t('pauseYes')}
                  </ActionForm>
                </div>
              </div>
            </details>
          ) : null}
          {status === 'suspended' && whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={rowClass('open')}>
              <RowContent glyph={<WhatsAppIcon width={16} height={16} />} label={t('contact')} />
            </a>
          ) : null}
        </div>
      ) : null}
    </BriefBar>
  )
}
