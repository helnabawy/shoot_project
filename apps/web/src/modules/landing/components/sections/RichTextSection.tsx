import { RichText } from '@payloadcms/richtext-lexical/react'
import type { RichTextBlock } from '@/payload-types'
import { Section } from '../Section'

export function RichTextSection({ block }: { block: RichTextBlock }) {
  if (!block.content) return null
  return (
    <Section id={block.anchor}>
      <div className="max-w-[65ch] text-[16px] leading-relaxed text-ink [&_h2]:mt-6 [&_h2]:text-[22px] [&_h2]:font-bold [&_p+p]:mt-3">
        <RichText data={block.content} />
      </div>
    </Section>
  )
}
