import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Bidi } from '@/shared/ui/Bidi'
import { BriefBar, GlyphTile, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { CalendarIcon, CheckIcon, HelpIcon, MinusIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { CreatorPickRow } from './CreatorPickRow'
import type { MatchSectionView } from './types'

export interface MatchResultsProps {
  sentence: string
  editHref: string
  /** "12 Dec", or null for "any date". */
  dateLabel: string | null
  sections: MatchSectionView[]
  nearby: { label: string; href: string }[]
  whatsappHref: string
  /** Shown once every professional type has a choice (several types), else null. */
  continueHref: string | null
  /** No price rule for this brief: WhatsApp becomes the one action (US1-S4). */
  priceOnRequest: boolean
}

/** Step 2 "Your creator" (surface brief quick-match-steps): one group per professional type under one price. */
export function MatchResults({ sentence, editHref, dateLabel, sections, nearby, whatsappHref, continueHref, priceOnRequest }: MatchResultsProps) {
  const t = useTranslations('match')
  const empty = sections.some((s) => s.creators.length === 0)
  return (
    <BriefBar as="section" aria-labelledby="match-heading" data-floating-hide>
      <ResultGroup label={t('yourBrief')}>
        <Link href={editHref} className={rowClass('set')}>
          <RowContent state="set" glyph={<CalendarIcon width={15} height={15} />} label={<span dir="auto">{sentence}</span>} trailing={t('editBrief')} />
        </Link>
      </ResultGroup>

      {sections.map((section) => {
        const label = dateLabel ? t('groupFree', { types: section.plural, date: dateLabel }) : t('groupAny', { types: section.plural })
        return (
          <ResultGroup
            key={section.personaId}
            id={`group-${section.personaId}`}
            label={
              <>
                {label}
                {section.price ? (
                  <>
                    {' · '}
                    <Bidi>{t('price', { price: section.price })}</Bidi>
                  </>
                ) : null}
              </>
            }
          >
            {section.deliverables.length ? <p className="px-4 pb-1.5 text-[13px] text-mute">{section.deliverables.join(' · ')}</p> : null}
            {section.price === null ? (
              <div className={rowClass('open', false)}>
                <RowContent glyph={<HelpIcon width={15} height={15} />} label={t('priceOnRequestRow')} trailing={t('priceOnRequest')} />
              </div>
            ) : null}
            {section.creators.length === 0 && dateLabel ? (
              <div className={rowClass('open', false)} data-testid="match-none">
                <RowContent glyph={<MinusIcon width={15} height={15} />} label={t('noneFree', { date: dateLabel })} />
              </div>
            ) : null}
            {section.creators.map((row) => (
              <CreatorPickRow key={row.id} row={row} chosenLabel={t('chosen')} saidYesLabel={t('saidYes')} />
            ))}
            {section.price !== null ? (
              <Link href={section.anyHref} data-testid="match-any" aria-current={section.anyChosen ? 'true' : undefined} className={rowClass(section.anyChosen ? 'set' : 'open')}>
                <RowContent
                  state={section.anyChosen ? 'set' : 'open'}
                  glyph={<CheckIcon width={15} height={15} />}
                  label={
                    <>
                      <span className="block font-semibold">{t('letUsChoose')}</span>
                      <span className="block text-[13px] font-normal text-mute">{t('letUsChooseNote')}</span>
                    </>
                  }
                  trailing={section.anyChosen ? t('chosen') : null}
                />
              </Link>
            ) : null}
          </ResultGroup>
        )
      })}

      {empty && nearby.length ? (
        <ResultGroup label={t('nearby')}>
          {nearby.map((d) => (
            <Link key={d.href} href={d.href} className={rowClass('open')} data-testid="match-nearby">
              <RowContent glyph={<CalendarIcon width={15} height={15} />} label={t('freeOn', { date: d.label })} />
            </Link>
          ))}
        </ResultGroup>
      ) : null}

      {continueHref && !priceOnRequest ? <TopHit href={continueHref} label={t('continue')} testId="match-continue" className="mb-2" /> : null}
      {priceOnRequest ? <TopHit href={whatsappHref} external label={t('askWhatsApp')} glyph={<WhatsAppIcon width={16} height={16} />} className="mb-2" /> : null}

      {!priceOnRequest ? (
        <ResultGroup label={t('actions')} className="border-t border-hair pt-1">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={rowClass('open')}>
            <span className="contents">
              <GlyphTile>
                <WhatsAppIcon width={15} height={15} />
              </GlyphTile>
              <span>{t('askWhatsApp')}</span>
              <span />
            </span>
          </a>
        </ResultGroup>
      ) : null}
    </BriefBar>
  )
}
