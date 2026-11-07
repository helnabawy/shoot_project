import type { RichTextBlock } from '@/payload-types'
import { RichContent } from '@/shared/ui/RichContent'
import { Section } from '../Section'

export function RichTextSection({ block, locale }: { block: RichTextBlock; locale?: string }) {
  if (!block.content) return null
  return (
    <Section id={block.anchor}>
      <RichContent data={block.content} locale={locale} />
    </Section>
  )
}
