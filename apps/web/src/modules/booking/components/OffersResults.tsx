import Link from 'next/link'
import { formatPicks, withPick, type Pick } from '@shoot/domain/booking'
import { formatMoney } from '@shoot/domain/pricing'
import { getTranslations } from 'next-intl/server'
import { creatorPath, describeCreator, getDirectoryContext } from '@/modules/creators'
import { PhotoTile } from '@/modules/creators/client'
import type { Locale } from '@/shared/lib/locale'
import { LiveRefresh } from '@/shared/components/LiveRefresh'
import { Bidi } from '@/shared/ui/Bidi'
import { BriefBar, cx, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { CalendarIcon, ClockIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { declineOfferAction } from '../actions'
import { liveMatchStamp } from '../live-actions'
import type { MatchPage } from '../match'
import { detailsPath } from '../paths'

/**
 * 022 step 2 (US4, boards 45–47): the offers for each professional type, lowest total first, as a list in which
 * every offer's Accept and Decline are visible (FR-016a). Only the first offer's Accept is the screen's primary
 * action. The page re-checks itself every few seconds while visible (FR-023).
 */
export async function OffersResults({
  page,
  refKey,
  locale,
  picks,
  editHref,
  whatsappHref,
  changed,
}: {
  page: MatchPage
  refKey: { ref: string; key: string }
  locale: string
  picks: Pick[]
  editHref: string
  whatsappHref: string
  /** 022 (board 48): the code of a creator whose offer moved while the client was on step 3. */
  changed?: string
}) {
  const t = await getTranslations({ locale, namespace: 'offers' })
  const tm = await getTranslations({ locale, namespace: 'match' })
  const money = (fils: number) => formatMoney(fils, locale)
  const ctx = await getDirectoryContext(locale as Locale)
  const who = (c: Parameters<typeof describeCreator>[0]) => describeCreator(c, ctx.lookups, ctx.prefix, locale as Locale)
  const chosenAll = page.sections.every((s) => picks.some((p) => p.persona === s.persona.slug && s.offers?.some((o) => o.creator.code === p.code)))
  const single = page.sections.length === 1
  const anyOffer = page.sections.some((s) => s.offers?.length)
  const noOneMatched = page.sentTo === 0 && !anyOffer
  const check = liveMatchStamp.bind(null, refKey.ref, refKey.key, locale)
  const moved = changed ? page.sections.flatMap((s) => s.offers ?? []).find((o) => o.creator.code === changed) : undefined

  return (
    <BriefBar as="section" aria-labelledby="match-heading" data-floating-hide>
      <LiveRefresh stamp={page.stamp} check={check} />
      {moved ? (
        <div role="status" className="mx-3 mb-2 rounded-[10px] bg-attention px-3 py-2.5 text-on-attention" data-testid="offer-changed">
          <p className="text-[15px] font-semibold">{t('changedTitle', { name: who(moved.creator).name.split(' ')[0] ?? '' })}</p>
          <p className="text-[14px]">{t('changedIntro')}</p>
        </div>
      ) : null}
      <ResultGroup label={tm('yourBrief')}>
        <Link href={editHref} className={rowClass('set')}>
          <RowContent state="set" glyph={<CalendarIcon width={15} height={15} />} label={<span dir="auto">{page.brief.sentence}</span>} trailing={tm('editBrief')} />
        </Link>
      </ResultGroup>

      {page.closed ? (
        <div className="px-4 pt-1 pb-3" data-testid="offers-closed">
          <p className="text-[20px] font-semibold tracking-[-0.01em]">{t('closedTitle')}</p>
          <p className="mt-1 text-[15px] leading-normal text-ink/80">{t('closedIntro')}</p>
          <TopHit href={editHref} label={t('newBrief')} testId="offers-new-brief" className="mt-3" />
        </div>
      ) : null}
      {!anyOffer && !noOneMatched && !page.closed ? (
        <div className="px-4 pt-1 pb-3" data-testid="offers-waiting">
          <p className="text-[20px] font-semibold tracking-[-0.01em]">{t('waitingTitle')}</p>
          <p className="mt-1 text-[15px] leading-normal text-ink/80">
            {t('waitingIntro', {
              count: page.sentTo,
              type: page.sections.map((s) => s.persona.singular.toLowerCase()).join(', '),
              types: page.sections.map((s) => s.persona.plural.toLowerCase()).join(', '),
              emirate: (page.brief.selections ?? []).find((s) => s.token === 'location')?.label ?? '',
            })}
          </p>
        </div>
      ) : null}

      {noOneMatched ? (
        <div className="px-4 py-3">
          <p className="text-[15px]">{tm('noneFree', { date: '' }).replace(/\s+$/, '')}</p>
        </div>
      ) : null}

      <div aria-live="polite" data-testid="offers-list">
        {page.sections.map((section, sectionIndex) => {
          const offers = section.offers ?? []
          const budget = section.budgetFils ? money(section.budgetFils) : ''
          return (
            <ResultGroup key={section.persona.id} id={`group-${section.persona.id}`} label={t('groupLabel', { type: section.persona.singular, price: budget })}>
              {offers.length === 0 ? (
                <div className={rowClass('open', false)} data-testid={`offers-waiting-${section.persona.slug}`}>
                  <RowContent glyph={<ClockIcon width={15} height={15} />} label={t('waitingNone')} trailing={t('waitingAuto')} />
                </div>
              ) : null}
              <ul className="flex flex-col gap-3 px-3 pb-2">
                {offers.map((offer, index) => {
                  const pick: Pick = { persona: section.persona.slug, code: offer.creator.code }
                  const nextPicks = withPick(picks, pick)
                  const chosen = picks.some((p) => p.persona === pick.persona && p.code === pick.code)
                  const acceptHref = single ? detailsPath(refKey.ref, refKey.key, locale, formatPicks(nextPicks)) : `?pick=${encodeURIComponent(formatPicks(nextPicks))}`
                  const primary = sectionIndex === 0 && index === 0 && !chosen
                  const view = who(offer.creator)
                  const first = view.name.split(' ')[0] ?? view.name
                  return (
                    <li key={offer.creator.id} data-testid="offer-card" data-code={offer.creator.code} className="flex flex-col gap-3 rounded-[14px] border border-hair bg-panel-solid p-3">
                      <div className="flex items-center gap-2.5">
                        <PhotoTile photo={offer.creator.photo} initials={view.initials} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{view.name}</p>
                          <p className="text-[13px] text-mute">
                            <Bidi>{view.displayCode}</Bidi>
                            {view.place ? ` · ${view.place}` : ''}
                          </p>
                        </div>
                        <span className={cx('rounded-full px-2.5 py-0.5 text-[13px] font-medium', offer.atYourPrice ? 'bg-success text-on-success' : 'bg-tile text-tile-ink')}>
                          {chosen ? t('chosen') : offer.atYourPrice ? t('atYourPrice') : t('theirPrice')}
                        </span>
                      </div>
                      <p className="flex items-baseline justify-between gap-2 border-t border-hair px-1 pt-2.5">
                        <span className="text-[13px] text-mute tabular-nums">
                          <Bidi>{t('breakdown', { amount: money(offer.amountFils), fee: money(offer.feeFils) })}</Bidi>
                        </span>
                        <span className="text-[22px] font-bold tracking-[-0.02em] tabular-nums">
                          <Bidi>{money(offer.totalFils)}</Bidi>
                        </span>
                      </p>
                      <div className="flex gap-2">
                        {primary ? (
                          <TopHit href={acceptHref} label={t('accept', { name: first })} testId="offer-accept" className="flex-[1.6]" />
                        ) : (
                          <Link href={acceptHref} data-testid="offer-accept" className="inline-flex min-h-[50px] flex-[1.6] items-center justify-center rounded-[9px] border border-control-border px-3 font-semibold text-ink">
                            {chosen ? t('chosen') : t('accept', { name: first })}
                          </Link>
                        )}
                        <form action={declineOfferAction} className="flex flex-1">
                          <input type="hidden" name="ref" value={refKey.ref} />
                          <input type="hidden" name="key" value={refKey.key} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="persona" value={section.persona.id} />
                          <input type="hidden" name="creator" value={offer.creator.id} />
                          <input type="hidden" name="code" value={offer.creator.code} />
                          <input type="hidden" name="personaSlug" value={section.persona.slug} />
                          <input type="hidden" name="pick" value={formatPicks(picks)} />
                          <button type="submit" data-testid="offer-decline" className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-[9px] border border-control-border px-3 font-medium text-ink">
                            {t('decline')}
                          </button>
                        </form>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {/* 022: the creators who can still answer, so a waiting list shows real people, not nothing. */}
              {section.waiting?.length ? (
                <div className="px-3 pb-2" data-testid={`offers-asked-${section.persona.slug}`}>
                  <p className="px-1 pt-1 pb-1.5 text-[13px] text-mute">{t('waitingFrom', { count: section.waiting.length })}</p>
                  <ul className="flex flex-col">
                    {section.waiting.map((creator) => {
                      const view = who(creator)
                      return (
                        <li key={creator.id}>
                          <Link href={creatorPath(creator.code, locale)} className={rowClass('open')} data-testid="offers-asked">
                            <PhotoTile photo={creator.photo} initials={view.initials} />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-ink">{view.name}</span>
                              <span className="block text-[13px] text-mute">
                                <Bidi>{view.displayCode}</Bidi>
                                {view.place ? ` · ${view.place}` : ''}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-tile px-2.5 py-0.5 text-[13px] text-tile-ink">{t('askedBadge')}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </ResultGroup>
          )
        })}
      </div>

      {!single ? (
        <div className="px-3 pt-1 pb-2">
          {chosenAll ? (
            <TopHit href={detailsPath(refKey.ref, refKey.key, locale, formatPicks(picks))} label={t('continue')} testId="offers-continue" />
          ) : (
            <p className="px-1 text-[13px] text-mute">{t('continueNeeds')}</p>
          )}
        </div>
      ) : null}

      <ResultGroup label={tm('actions')} className="border-t border-hair pb-2">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={rowClass('open')}>
          <RowContent glyph={<WhatsAppIcon width={15} height={15} />} label={tm('askWhatsApp')} />
        </a>
      </ResultGroup>
    </BriefBar>
  )
}
