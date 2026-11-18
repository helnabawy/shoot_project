import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { Bidi } from '@/shared/ui/Bidi'
import { BriefBar, GlyphTile, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { CheckIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { PhotoTile } from '@/modules/creators/client'
import { ContactButtons, type ContactView } from './ContactRows'
import { PrintButton } from './PrintButton'

export interface QuoteLineView {
  kind: string
  label: string
  amount: string
  deliverables: string[]
}

export interface QuotationViewProps {
  reference: string
  version: number
  issued: string
  validUntil: string
  replacedBy: { reference: string; href: string | null } | null
  sentence: string
  /** One entry per booked creator (photo or initials, their types), or per type the team still chooses. */
  creators: { type: string; name: string | null; photo?: { url: string; alt: string } | null; initials?: string; contact?: ContactView | null }[]
  lines: QuoteLineView[]
  total: string
  terms?: SerializedEditorState | null
  /** The status sentence and the one action for the current state (BookingStatus). */
  status: ReactNode
  whatsappHref: string
  /** Promo feedback after step 3 ("That code has expired."). */
  notice?: string | null
  error?: string | null
  /** Quiet actions after the document, e.g. cancelling (never next to the one primary action). */
  endActions?: ReactNode
}

/** The quotation document and the booking's status (surface brief quotation); prints as itself on A4. */
export function QuotationView(props: QuotationViewProps) {
  const t = useTranslations('quote')
  return (
    <article aria-labelledby="quote-heading" className="quote-doc">
      <BriefBar as="div" className="print:shadow-none print:border-0" data-floating-hide>
        <header className="px-4 pt-4 pb-2">
          <h1 id="quote-heading" className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
            {(() => {
              // Only the reference is isolated left-to-right; the words follow the page direction.
              const [before = '', after = ''] = String(t.raw('title')).split('{reference}')
              return (
                <>
                  {before}
                  <Bidi>{props.reference}</Bidi>
                  {after}
                </>
              )
            })()}
          </h1>
          <p className="mt-1 text-[13px] text-mute tabular-nums">
            {t('issued', { date: props.issued })} · {t('validUntil', { date: props.validUntil })}
            {props.version > 1 ? ` · ${t('version', { n: props.version })}` : ''}
          </p>
          {props.replacedBy ? (
            <p className="mt-2 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention" data-testid="quote-replaced">
              {props.replacedBy.href ? <a href={props.replacedBy.href}>{t('replacedBy', { reference: props.replacedBy.reference })}</a> : t('replacedBy', { reference: props.replacedBy.reference })}
            </p>
          ) : null}
        </header>

        {props.error ? (
          <p role="alert" className="mx-4 mb-2 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
            {props.error}
          </p>
        ) : null}
        {props.notice ? (
          <p role="status" className="mx-4 mb-2 text-[13px] text-mute" data-testid="quote-notice">
            {props.notice}
          </p>
        ) : null}

        <div className="print:hidden">{props.status}</div>

        <ResultGroup label={t('brief')}>
          <p dir="auto" className="px-4 pb-2 text-[15px] text-ink">
            {props.sentence}
          </p>
        </ResultGroup>
        <ResultGroup label={t('creators')}>
          {props.creators.map((c) =>
            c.name ? (
              <div key={`${c.name}-${c.type}`} className="mx-1.5 grid gap-x-4 gap-y-2.5 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-testid="quote-creator">
                <div className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
                  <PhotoTile photo={c.photo ?? null} initials={c.initials ?? ''} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{c.name}</span>
                    <span className="block text-[13px] text-mute [&:lang(ar)]:text-[14px]">
                      {c.type}
                      {c.contact ? (
                        <span className="print:hidden">
                          {' · '}
                          <bdi dir="ltr" className="tabular-nums" data-testid="quote-creator-phone">
                            {c.contact.display}
                          </bdi>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </div>
                {c.contact ? <ContactButtons contact={c.contact} who={c.name} className="sm:w-[248px]" /> : null}
              </div>
            ) : (
              <div key={c.type} className={rowClass('open', false)}>
                <RowContent glyph={<CheckIcon width={15} height={15} />} label={c.type} trailing={t('weChoose')} />
              </div>
            ),
          )}
        </ResultGroup>

        <ResultGroup label={t('lines')}>
          <dl data-testid="quote-lines">
            {props.lines.map((line, i) => (
              <div key={i} className="mx-1.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-2.5 py-1.5 [break-inside:avoid]">
                <dt className="text-[15px] text-ink">
                  {line.label}
                  {line.deliverables.length ? <span className="block text-[13px] text-mute">{line.deliverables.join(' · ')}</span> : null}
                </dt>
                <dd className="text-end text-[15px] tabular-nums text-ink">
                  <Bidi>{line.amount}</Bidi>
                </dd>
              </div>
            ))}
            <div className="mx-1.5 mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-hair px-2.5 pt-2 pb-1">
              <dt className="text-[17px] font-semibold text-ink">
                {t('total')}
                <span className="block text-[13px] font-normal text-mute">{t('vat')}</span>
              </dt>
              <dd className="text-end text-[17px] font-semibold tabular-nums text-ink" data-testid="quote-total">
                <Bidi>{props.total}</Bidi>
              </dd>
            </div>
          </dl>
        </ResultGroup>

        {props.terms ? (
          <ResultGroup label={t('terms')}>
            <div className="prose-sm px-4 pb-3 text-[13px] text-mute">
              <RichText data={props.terms} />
            </div>
          </ResultGroup>
        ) : null}

        <div className="border-t border-hair py-1 print:hidden">
          <PrintButton label={t('download')} />
          <a href={props.whatsappHref} target="_blank" rel="noopener noreferrer" className={rowClass('open')}>
            <span className="contents">
              <GlyphTile>
                <WhatsAppIcon width={15} height={15} />
              </GlyphTile>
              <span>{t('askWhatsApp')}</span>
              <span />
            </span>
          </a>
          {props.endActions}
        </div>
      </BriefBar>
    </article>
  )
}
