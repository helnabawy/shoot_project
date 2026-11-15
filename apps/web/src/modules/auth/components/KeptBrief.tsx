import { CheckIcon } from '@/shared/ui/icons'
import { ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'

/**
 * Feature 021 (BS-US1-S1): the guest's kept brief at the top of the sign-in panel, as the set row the
 * brief bar printed, with a way back to change it (the summary-row pattern of the Quick Match details
 * step). The sentence keeps the language it was built in.
 */
export function KeptBrief({ sentence, sentenceLocale, href, label, changeLabel }: { sentence: string; sentenceLocale: string; href: string; label: string; changeLabel: string }) {
  return (
    <div data-testid="kept-brief" className="border-b border-hair pb-1.5">
      <ResultGroup label={label}>
        <div className={rowClass('set', false)}>
          <RowContent
            state="set"
            glyph={<CheckIcon width={15} height={15} />}
            label={
              <span lang={sentenceLocale} dir="auto">
                {sentence}
              </span>
            }
            trailing={
              <a href={href} className="-mx-2 inline-flex min-h-11 items-center px-2 underline underline-offset-2">
                {changeLabel}
              </a>
            }
          />
        </div>
      </ResultGroup>
    </div>
  )
}
