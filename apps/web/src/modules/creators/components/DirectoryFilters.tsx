import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { BarField, BriefBar, cx, GlyphTile, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { CheckIcon, ChevronDownIcon, CloseIcon, PinIcon, TagIcon, UserIcon } from '@/shared/ui/icons'
import type { FilterGroupView, FilterKey } from '../directory'

const ICONS: Record<FilterKey, ReactNode> = {
  type: <UserIcon width={16} height={16} />,
  specialty: <TagIcon width={16} height={16} />,
  place: <PinIcon width={16} height={16} />,
}

/**
 * The directory's panel: the search field prints the chosen filters as tokens, each filter is a row
 * that opens its options with counts, and the Top Hit is the best match (surface brief
 * creators-directory). Filters are links, so it works without JavaScript.
 */
export function DirectoryFilters({
  groups,
  tokens,
  clearHref,
  topHit,
  message,
  briefHref,
}: {
  groups: FilterGroupView[]
  tokens: string[]
  clearHref: string | null
  /** The best match as a ready-made Top Hit row. */
  topHit: ReactNode
  /** Why there is no best match, when there is none. */
  message: 'empty' | 'noMatch' | null
  briefHref: string
}) {
  const t = useTranslations('creators.directory')
  const labels: Record<FilterKey, string> = { type: t('professional'), specialty: t('specialty'), place: t('emirate') }
  const visible = groups.filter((g) => g.options.length > 0)
  return (
    <BriefBar as="section" data-testid="directory-filters" aria-label={t('filtersLabel')}>
      <BarField>
        {tokens.length ? (
          tokens.map((token, i) => (
            <span key={i} className="me-1.5 inline-block rounded-md bg-selected px-[5px]">
              {token}
            </span>
          ))
        ) : (
          <span className="text-mute">{t('searchAll')}</span>
        )}
      </BarField>
      {visible.length ? (
        <ResultGroup label={t('filtersLabel')} className="py-1">
          {visible.map((g) => (
            <details key={g.key} name="creators-filter" className="group" data-testid={`filter-${g.key}`}>
              <summary className={cx(rowClass('open'), 'list-none [&::-webkit-details-marker]:hidden')}>
                <GlyphTile>{ICONS[g.key]}</GlyphTile>
                <span>{labels[g.key]}</span>
                <span className="flex items-center gap-1 text-end text-[13px] font-normal text-mute">
                  {g.current ?? t('any')}
                  <ChevronDownIcon width={16} height={16} className="transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <ul className="pb-1">
                <li>
                  <Link href={g.anyHref} className={rowClass(g.current ? 'open' : 'set')} data-testid="filter-option" data-value="">
                    <RowContent glyph={g.current ? ICONS[g.key] : <CheckIcon width={16} height={16} />} label={t('any')} state={g.current ? 'open' : 'set'} />
                  </Link>
                </li>
                {g.options.map((o) => (
                  <li key={o.slug}>
                    <Link href={o.href} aria-current={o.selected ? 'true' : undefined} className={rowClass(o.selected ? 'set' : 'open')} data-testid="filter-option" data-value={o.slug}>
                      <RowContent
                        glyph={o.selected ? <CheckIcon width={16} height={16} /> : ICONS[g.key]}
                        label={o.name}
                        trailing={<span className="tabular-nums">{o.count}</span>}
                        state={o.selected ? 'set' : 'open'}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          {clearHref ? (
            <Link href={clearHref} className={rowClass('open')} data-testid="filter-clear">
              <RowContent glyph={<CloseIcon width={16} height={16} />} label={t('clear')} />
            </Link>
          ) : null}
        </ResultGroup>
      ) : null}
      <div className="border-t border-hair pt-1 pb-2">
        <ResultGroup label={t('topHit')} className="pb-1">
          {topHit ?? (
            <>
              <div data-testid="directory-empty" className={rowClass('open', false)}>
                <RowContent glyph={<UserIcon width={16} height={16} />} label={message === 'empty' ? t('empty') : t('noMatch')} />
              </div>
              <TopHit label={t('briefInstead')} href={briefHref} />
            </>
          )}
        </ResultGroup>
      </div>
    </BriefBar>
  )
}
