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
              <summary className="grid min-h-12 cursor-pointer list-none grid-cols-[minmax(0,1fr)_20px] items-center gap-3 px-4 py-3 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronIcon
                  width={16}
                  height={16}
                  className="text-mute group-open:rotate-90 motion-safe:transition-transform motion-safe:duration-150"
                />
              </summary>
              {item.answer ? (
                <div className="px-4 pb-4 text-[15px] leading-relaxed text-mute [&_p+p]:mt-2">
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
