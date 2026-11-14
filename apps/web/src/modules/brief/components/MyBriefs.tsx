import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import type { Brief } from '@/payload-types'
import { rowClass, RowContent } from '@/shared/ui/bar'
import { Bidi } from '@/shared/ui/Bidi'
import { PlusIcon, SearchIcon } from '@/shared/ui/icons'

/**
 * A member's briefs as rows on the ground: sentence, reference and status (FR-052, US8-S8). `offerNew` adds
 * "Start a brief" as an ordinary row; the account page drops it when its Top Hit already says that.
 */
export async function MyBriefs({
  briefs,
  locale,
  offerNew = true,
  saidYes,
}: {
  briefs: Brief[]
  locale: string
  offerNew?: boolean
  /** 019: creators who said yes, per brief id. */
  saidYes?: ReadonlyMap<number, number>
}) {
  const t = await getTranslations({ locale, namespace: 'account' })
  if (!briefs.length && !offerNew) return null
  return (
    <section aria-labelledby="my-briefs-title" data-testid="my-briefs">
      <h2 id="my-briefs-title" className="group-label px-1 pb-2">
        {t('briefs')}
      </h2>
      <ul className="-mx-3 divide-y divide-hair border-y border-hair">
        {briefs.length === 0 ? (
          <li className="px-4 py-3 text-[15px] text-mute">{t('noBriefs')}</li>
        ) : null}
        {briefs.map((brief) => (
          <li key={brief.id} className="py-1">
            <div className={rowClass('open', false)}>
              <RowContent
                glyph={<SearchIcon width={15} height={15} />}
                label={
                  <>
                    <span dir="auto" className="block text-[15px] text-ink">
                      {brief.sentence}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-mute [&:lang(ar)]:text-[14px]">
                      <Bidi>{brief.reference}</Bidi> · {t(`status.${brief.status ?? 'new'}`)}
                    </span>
                    {saidYes?.get(brief.id) ? (
                      <span data-testid="brief-said-yes" className="mt-0.5 block text-[13px] font-medium text-selected-ink">
                        {t('saidYes', { count: saidYes.get(brief.id)! })}
                      </span>
                    ) : null}
                  </>
                }
              />
            </div>
          </li>
        ))}
        {offerNew ? (
          <li className="py-1">
            <Link href={`${localizeHref('/', locale)}#brief`} className={rowClass('open')}>
              <RowContent glyph={<PlusIcon width={15} height={15} />} label={t('newBrief')} />
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  )
}
