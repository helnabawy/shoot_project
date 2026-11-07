'use client'

import { cx, RowContent, rowClass } from '@/shared/ui/bar'
import { DocumentIcon } from '@/shared/ui/icons'

/** "Download PDF": the browser's own Save as PDF from the quotation's print layout (research §9). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start js-only print:hidden')} data-testid="quote-print">
      <RowContent glyph={<DocumentIcon width={15} height={15} />} label={label} />
    </button>
  )
}
