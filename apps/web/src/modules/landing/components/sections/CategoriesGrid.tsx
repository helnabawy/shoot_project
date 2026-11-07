import { type SpecialtyCounts } from '@shoot/domain/creators'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { CategoriesGridBlock, Category } from '@/payload-types'
import type { AudienceCategory } from '@/modules/personas/queries'
import { countsLine } from '@/modules/creators/counts'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { localizeHref } from '@/shared/i18n/href'
import { GlyphTile, RowContent, rowClass } from '@/shared/ui/bar'
import { RowList, Section } from '../Section'

export function CategoriesGrid({
  block,
  audienceCategories,
  counts = {},
  contact,
  locale,
}: {
  block: CategoriesGridBlock
  audienceCategories: AudienceCategory[]
  /** Real sample and professional counts per category id, from the listed creators. */
  counts?: Record<string, SpecialtyCounts>
  contact: ContactDetails
  locale: string
}) {
  const t = useTranslations('creators.specialty')
  const manual = (block.categories ?? []).filter(
    (c): c is Category => typeof c === 'object' && c !== null && c.active !== false,
  )
  const items =
    block.source === 'manual'
      ? manual.map((c) => ({
          id: String(c.id),
          slug: c.slug,
          name: c.name,
          glyph: c.glyph,
          description: c.description,
        }))
      : audienceCategories
  if (items.length === 0) return null
  // A specialty page exists for every category the site's audience offers; a hand-picked one outside it has none.
  const hasPage = new Set(audienceCategories.map((c) => String(c.id)))
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.subheading}>
      <RowList columns={2}>
        {items.map((c) => {
          const line = countsLine((key, values) => t(key, values), counts[String(c.id)])
          return (
            <li key={c.id} className="py-1">
              {hasPage.has(String(c.id)) ? (
                <Link href={localizeHref(`/work/${c.slug}`, locale)} className={rowClass('open')} data-testid="category-link">
                  <RowContent glyph={c.glyph} label={c.name} trailing={line ? <span data-testid="category-counts" className="tabular-nums">{line}</span> : null} />
                </Link>
              ) : (
                // No page to open, so no row to tap: quiet text, not a look-alike link.
                <div className="grid min-h-11 grid-cols-[30px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5" data-testid="category-plain">
                  <GlyphTile>{c.glyph}</GlyphTile>
                  <span className="text-[16px] text-mute">{c.name}</span>
                </div>
              )}
            </li>
          )
        })}
      </RowList>
      {block.cta?.label ? (
        <div className="mt-4 -mx-2">
          <CtaLink cta={block.cta} contact={contact} locale={locale} variant="secondary" />
        </div>
      ) : null}
    </Section>
  )
}
