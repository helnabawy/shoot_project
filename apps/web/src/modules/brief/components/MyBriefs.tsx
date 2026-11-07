import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import type { Brief } from '@/payload-types'
import { CheckIcon } from '@/shared/ui/icons'
import { BriefBar, ResultGroup, rowClass, RowContent } from '@/shared/ui/bar'
import { Bidi } from '@/shared/ui/Bidi'

/** A member's briefs as completed rows: sentence, reference and status (FR-052, US8-S8). */
export async function MyBriefs({ briefs, locale }: { briefs: Brief[]; locale: string }) {
  const t = await getTranslations({ locale, namespace: 'account' })
  return (
    <BriefBar className="mt-4" data-testid="my-briefs">
      <ResultGroup label={t('briefs')} className="pt-1">
        {briefs.length === 0 ? <p className="px-4 py-3 text-[15px] text-mute">{t('noBriefs')}</p> : null}
        {briefs.map((brief) => (
          <div key={brief.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 px-4 py-2.5">
            <span className="grid size-[30px] place-items-center rounded-[var(--radius-tile)] bg-ink text-ground">
              <CheckIcon width={15} height={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] text-ink">{brief.sentence}</p>
              <p className="mt-0.5 text-[13px] text-mute">
                <Bidi>{brief.reference}</Bidi> · {t(`status.${brief.status ?? 'new'}`)}
              </p>
            </div>
          </div>
        ))}
      </ResultGroup>
      <div className="border-t border-hair py-1">
        <Link href={`${localizeHref('/', locale)}#brief`} className={rowClass('open')}>
          <RowContent glyph="+" label={t('newBrief')} />
        </Link>
      </div>
    </BriefBar>
  )
}
