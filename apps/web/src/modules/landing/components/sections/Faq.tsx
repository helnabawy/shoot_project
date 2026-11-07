import { RichText } from '@payloadcms/richtext-lexical/react'
import type { FaqBlock } from '@/payload-types'
import { ChevronIcon } from '@/shared/ui/icons'
import { RowList, Section } from '../Section'

/** Expanding rows; <details> works without JavaScript and announces its state. */
export function Faq({ block }: { block: FaqBlock }) {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <Section id={block.anchor} heading={block.heading}>
      <RowList>
        {items.map((item, i) => (
          <li key={item.id ?? i}>
            <details className="group">
              {/* The whole row is the target; hover tints it like a result row, open sets it semibold. */}
              <summary className="grid min-h-13 cursor-pointer list-none grid-cols-[minmax(0,1fr)_28px] items-center gap-3 px-4 py-3.5 text-[16px] font-medium leading-snug text-ink transition-colors duration-100 hover:bg-ink/[0.035] focus-visible:-outline-offset-2 group-open:font-semibold [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="grid size-7 place-items-center rounded-[var(--radius-tile)] bg-tile text-tile-ink">
                  <ChevronIcon
                    width={14}
                    height={14}
                    className="group-open:rotate-90 rtl:group-open:-rotate-90 motion-safe:transition-transform motion-safe:duration-150"
                  />
                </span>
              </summary>
              {item.answer ? (
                <div className="max-w-[62ch] px-4 pt-0.5 pb-5 text-[15px] leading-relaxed text-pretty text-mute [&_p+p]:mt-2">
                  <RichText data={item.answer} />
                </div>
              ) : null}
            </details>
          </li>
        ))}
      </RowList>
    </Section>
  )
}
