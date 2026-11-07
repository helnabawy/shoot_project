import type { FeaturesBlock } from '@/payload-types'
import { GlyphTile } from '@/shared/ui/bar'
import { RowList, Section } from '../Section'

export function Features({ block }: { block: FeaturesBlock }) {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.subheading}>
      <RowList>
        {items.map((item, i) => (
          <li key={item.id ?? i} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 px-4 py-3.5">
            <GlyphTile>{item.glyph}</GlyphTile>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">{item.title}</h3>
              {item.body ? (
                <p className="mt-0.5 text-[15px] leading-relaxed text-mute">{item.body}</p>
              ) : null}
            </div>
          </li>
        ))}
      </RowList>
    </Section>
  )
}
