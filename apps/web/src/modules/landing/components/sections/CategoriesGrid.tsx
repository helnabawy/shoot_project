import type { CategoriesGridBlock, Category } from '@/payload-types'
import type { AudienceCategory } from '@/modules/personas/queries'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { GlyphTile } from '@/shared/ui/bar'
import { RowList, Section } from '../Section'

export function CategoriesGrid({
  block,
  audienceCategories,
  contact,
  locale,
}: {
  block: CategoriesGridBlock
  audienceCategories: AudienceCategory[]
  contact: ContactDetails
  locale: string
}) {
  const manual = (block.categories ?? []).filter(
    (c): c is Category => typeof c === 'object' && c !== null && c.active !== false,
  )
  const items =
    block.source === 'manual'
      ? manual.map((c) => ({
          id: String(c.id),
          name: c.name,
          glyph: c.glyph,
          description: c.description,
        }))
      : audienceCategories
  if (items.length === 0) return null
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.subheading}>
      <RowList columns={2}>
        {items.map((c) => (
          <li
            key={c.id}
            className="grid min-h-11 grid-cols-[30px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5"
          >
            <GlyphTile>{c.glyph}</GlyphTile>
            <span className="text-[16px] text-ink">{c.name}</span>
          </li>
        ))}
      </RowList>
      {block.cta?.label ? (
        <div className="mt-4 -mx-2">
          <CtaLink cta={block.cta} contact={contact} locale={locale} variant="secondary" />
        </div>
      ) : null}
    </Section>
  )
}
