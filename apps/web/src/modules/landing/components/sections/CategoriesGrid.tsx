import { type SpecialtyCounts } from '@shoot/domain/creators'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import type { CategoriesGridBlock, Category } from '@/payload-types'
import type { AudienceCategory } from '@/modules/personas/queries'
import { countsLine } from '@/modules/creators/counts'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { mediaSource } from '@/shared/components/CmsImage'
import { localizeHref } from '@/shared/i18n/href'
import { SpecialtyScene } from './SpecialtyScene'

/** The ticker repeats the names until one pass is wider than the widest screen. */
const TICKER_MIN = 8

type TileItem = Pick<AudienceCategory, 'id' | 'slug' | 'name' | 'glyph' | 'scene' | 'image'>

const fromCategory = (c: Category): TileItem => ({
  id: String(c.id),
  slug: c.slug,
  name: c.name,
  glyph: c.glyph,
  scene: c.scene ?? null,
  image: c.image && typeof c.image === 'object' ? mediaSource(c.image, 'card') : null,
})

/** One specialty: the drawing (or its CMS image), and under a dark fade its number, name and counts. */
function Tile({ item, index, counts, href }: { item: TileItem; index: number; counts: string | null; href?: string }) {
  const body: ReactNode = (
    <>
      {item.image ? (
        <span className="kd-art absolute inset-0">
          <Image src={item.image.url} alt="" fill sizes="(max-width: 639px) 132px, (max-width: 1023px) 33vw, 180px" className="object-cover" />
        </span>
      ) : (
        <SpecialtyScene scene={item.scene} glyph={item.glyph} />
      )}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-linear-to-t from-[rgb(29_18_12/0.86)] to-transparent px-3 pt-11 pb-3 text-white">
        <span aria-hidden="true" className="text-[12px] font-semibold tabular-nums text-white/85">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="text-[17px] font-semibold leading-tight text-balance">{item.name}</span>
        {counts ? (
          <span data-testid="category-counts" className="text-[12px] leading-snug tabular-nums text-white/85">
            {counts}
          </span>
        ) : null}
      </span>
    </>
  )
  const tile =
    'kd relative block h-[236px] w-[132px] shrink-0 snap-start overflow-hidden rounded-[14px] sm:aspect-[4/5] sm:h-auto sm:w-full lg:aspect-[132/236]'
  return href ? (
    <Link href={href} className={`${tile} group`} data-testid="category-link">
      {body}
    </Link>
  ) : (
    // No page to open, so no tile to tap: the same picture, not a look-alike link.
    <div className={tile} data-testid="category-plain">
      {body}
    </div>
  )
}

/**
 * "What do you need shot?" (design 05 Landing): the specialties as picture tiles that open their
 * pages, under a decorative ticker of their names. On phones the tiles run in a row that scrolls
 * sideways and snaps; from 640 px they sit in a grid. The CMS block's subheading is the small group
 * label above the heading, as in the bar's result groups.
 */
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
  const items: TileItem[] = block.source === 'manual' ? manual.map(fromCategory) : audienceCategories
  if (items.length === 0) return null
  // A specialty page exists for every category the site's audience offers; a hand-picked one outside it has none.
  const hasPage = new Set(audienceCategories.map((c) => String(c.id)))
  const names = items.map((c) => c.name)
  const pass = Array.from({ length: Math.ceil(TICKER_MIN / names.length) }, () => names).flat()
  const headingId = block.anchor ? `${block.anchor}-heading` : undefined

  return (
    <section
      id={block.anchor ?? undefined}
      data-testid={block.anchor ? `section-${block.anchor}` : undefined}
      aria-labelledby={block.heading ? headingId : undefined}
      className="pt-10 lg:pt-16"
    >
      <div aria-hidden="true" className="kinds-ticker overflow-hidden select-none">
        <div className="kinds-ticker-track flex w-max">
          {[0, 1].map((copy) =>
            pass.map((name, i) => (
              <span
                key={`${copy}-${i}`}
                className="pe-7 text-[54px] font-bold leading-[1.6] tracking-[-0.04em] whitespace-nowrap text-[color-mix(in_oklab,var(--ink)_8%,var(--ground))] lg:text-[88px]"
              >
                {name}
              </span>
            )),
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-6 sm:px-6 lg:max-w-[1080px] lg:pt-8">
        {block.subheading ? (
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-mute uppercase sm:text-[12px]">
            {block.subheading}
          </p>
        ) : null}
        {block.heading ? (
          <h2 id={headingId} className="text-[28px] leading-tight font-bold tracking-[-0.03em] text-balance text-ink sm:text-[34px] lg:text-[40px]">
            {block.heading}
          </h2>
        ) : null}

        <ul
          className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:gap-4"
        >
          {items.map((c, index) => {
            const line = countsLine((key, values) => t(key, values), counts[String(c.id)]) || null
            return (
              <li key={c.id} className="flex">
                <Tile
                  item={c}
                  index={index}
                  counts={line}
                  href={hasPage.has(String(c.id)) ? localizeHref(`/work/${c.slug}`, locale) : undefined}
                />
              </li>
            )
          })}
        </ul>

        {block.cta?.label ? (
          <div className="mt-4 -mx-2">
            <CtaLink cta={block.cta} contact={contact} locale={locale} variant="secondary" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
