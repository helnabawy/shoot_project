import type { FeaturesBlock } from '@/payload-types'
import { GlyphTile } from '@/shared/ui/bar'
import { RowList, Section } from '../Section'

/** Reasons as cells on a hairline grid: two across from 640 px, so they read apart from the rows. */
export function Features({ block }: { block: FeaturesBlock }) {
  const items = block.items ?? []
  if (items.length === 0) return null
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.subheading}>
      <RowList columns={2}>
        {items.map((item, i) => (
          <li
            key={item.id ?? i}
            className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3.5 px-4 py-4 sm:grid-cols-1 sm:gap-y-3 sm:px-5 sm:py-6"
          >
            <GlyphTile>{item.glyph}</GlyphTile>
            <div className="pt-[5px] sm:pt-0">
              <h3 className="text-[16px] font-semibold leading-snug text-ink">{item.title}</h3>
              {item.body ? (
                <p className="mt-1 text-[15px] leading-relaxed text-pretty text-mute">
                  {item.body}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </RowList>
    </Section>
  )
}
