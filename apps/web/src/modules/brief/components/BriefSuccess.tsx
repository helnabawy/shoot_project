'use client'

import { CheckIcon, UserIcon, WhatsAppIcon } from '@/shared/ui/icons'
import {
  BarField,
  BriefBar,
  ResultGroup,
  ResultRow,
  rowClass,
  RowContent,
  TopHit,
} from '@/shared/ui/bar'
import { Bidi } from '@/shared/ui/Bidi'
import { fill, type BriefLabels } from '../labels'

/** The bar after a brief is sent: the fixed sentence, a reference and what happens next (FR-059). */
export function BriefSuccess({
  sentence,
  reference,
  replyTime,
  whatsappUrl,
  message,
  onAnother,
  labels,
  tone = 'default',
}: {
  sentence: string
  reference: string
  replyTime: string
  whatsappUrl: string
  message?: string
  onAnother: () => void
  labels: BriefLabels
  tone?: 'default' | 'glass'
}) {
  const [before, after = ''] = labels.successReference.split('{reference}')
  return (
    <BriefBar tone={tone} data-testid="brief-success">
      <BarField>
        <p>{sentence}</p>
      </BarField>
      <div className="pt-1.5" role="status" aria-live="polite">
        <span className="group-label block px-4 pt-1 pb-1">{labels.successTitle}</span>
        <TopHit
          label={labels.successOpenWhatsapp}
          href={whatsappUrl}
          external
          glyph={<WhatsAppIcon width={16} height={16} />}
          testId="brief-open-whatsapp"
        />
        <ResultGroup label={labels.successNextTitle} className="mt-1.5 border-t border-hair">
          <ResultRow
            glyph={<CheckIcon width={15} height={15} />}
            state="set"
            label={
              <span data-testid="brief-reference">
                {before}
                <Bidi>{reference}</Bidi>
                {after}
              </span>
            }
          />
          {message ? (
            <ResultRow glyph={<UserIcon width={15} height={15} />} label={message} />
          ) : null}
          <ResultRow
            glyph={<WhatsAppIcon width={15} height={15} />}
            label={fill(labels.successNext, { replyTime })}
          />
          <button
            type="button"
            onClick={onAnother}
            className={`${rowClass('open')} w-full text-start`}
          >
            <RowContent glyph="+" label={labels.successAnother} />
          </button>
        </ResultGroup>
      </div>
    </BriefBar>
  )
}
