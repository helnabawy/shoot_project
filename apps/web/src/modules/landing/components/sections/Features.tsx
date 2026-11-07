import type { ReactNode } from 'react'
import type { FeaturesBlock } from '@/payload-types'
import { cx, GlyphTile } from '@/shared/ui/bar'
import { ForwardIcon, GlobeIcon, ReturnIcon, SearchIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { RowList, Section } from '../Section'

type Item = NonNullable<FeaturesBlock['items']>[number]
type Anchor = Exclude<NonNullable<Item['pointsAt']>, 'none'>

/**
 * Where each part of the drawn brief sits: its row in the drawing and the side its edge faces.
 * Classes are written out whole so Tailwind sees them.
 */
const PARTS: Record<Anchor, { side: 'start' | 'end'; cell: string }> = {
  sentence: { side: 'start', cell: 'lg:col-start-1 lg:row-start-1' },
  language: { side: 'end', cell: 'lg:col-start-3 lg:row-start-1' },
  send: { side: 'start', cell: 'lg:col-start-1 lg:row-start-3' },
  whatsapp: { side: 'end', cell: 'lg:col-start-3 lg:row-start-4' },
}
const ANCHORS = Object.keys(PARTS) as Anchor[]

/**
 * The reasons as an annotated drawing of the brief itself. Each reason the CMS points at a part of
 * the bar (`pointsAt`) is numbered on that part's edge; from 1024 px it hangs beside the drawing on a
 * leader line, below that it lists under it. Reasons that point at nothing, or at a part already
 * taken, keep the hairline cell grid beneath; with none pointed, the section is that grid alone.
 */
export function Features({ block }: { block: FeaturesBlock }) {
  const items = block.items ?? []
  if (items.length === 0) return null

  // The first reason on each part is pointed; numbers follow the drawing (top to bottom, start
  // before end), so the list under it reads in the order the eye walks the bar.
  const taken = new Map<Anchor, Item>()
  const rest: Item[] = []
  for (const item of items) {
    const anchor = item.pointsAt && item.pointsAt !== 'none' ? item.pointsAt : null
    if (anchor && !taken.has(anchor)) taken.set(anchor, item)
    else rest.push(item)
  }
  const placed = ANCHORS.filter((a) => taken.has(a)).map((anchor, i) => ({
    item: taken.get(anchor) as Item,
    anchor,
    n: i + 1,
  }))
  const marks = Object.fromEntries(placed.map((p) => [p.anchor, p.n])) as Partial<
    Record<Anchor, number>
  >

  return (
    <Section
      id={block.anchor}
      heading={block.heading}
      subheading={block.subheading}
      wide={placed.length > 0}
    >
      {placed.length > 0 ? (
        <div
          data-testid="features-figure"
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_auto]"
        >
          <BriefDrawing marks={marks} />
          <ol className="-mx-4 mt-8 divide-y divide-hair border-y border-hair lg:col-span-3 lg:col-start-1 lg:row-span-4 lg:row-start-1 lg:mx-0 lg:mt-0 lg:grid lg:grid-cols-subgrid lg:grid-rows-subgrid lg:divide-y-0 lg:border-0">
            {placed.map(({ item, anchor, n }) => (
              <Callout key={item.id ?? anchor} item={item} n={n} anchor={anchor} />
            ))}
          </ol>
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className={cx(placed.length > 0 && 'mt-10 lg:mt-14')}>
          <RowList columns={2}>
            {rest.map((item, i) => (
              <FeatureCell key={item.id ?? i} item={item} />
            ))}
          </RowList>
        </div>
      ) : null}
    </Section>
  )
}

/** A reason in the grid: a resting tile above (beside, on phones) its title and body. */
function FeatureCell({ item }: { item: Item }) {
  return (
    <li className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3.5 px-4 py-4 sm:grid-cols-1 sm:gap-y-3 sm:px-5 sm:py-6">
      <GlyphTile>{item.glyph}</GlyphTile>
      <div className="pt-[5px] sm:pt-0">
        <h3 className="text-[16px] font-semibold leading-snug text-ink">{item.title}</h3>
        {item.body ? (
          <p className="mt-1 text-[15px] leading-relaxed text-pretty text-mute">{item.body}</p>
        ) : null}
      </div>
    </li>
  )
}

/**
 * A pointed reason. Below 1024 px: a row led by its number. From 1024 px: placed in its part's row
 * on its part's side, the words facing the drawing and a leader line running to the numbered mark
 * on the drawing's edge (the line's last pixels hide under the mark).
 */
function Callout({ item, n, anchor }: { item: Item; n: number; anchor: Anchor }) {
  const { side, cell } = PARTS[anchor]
  return (
    <li
      className={cx(
        'flex gap-3.5 px-4 py-4 lg:items-center lg:gap-4 lg:px-0 lg:py-3',
        side === 'end' && 'lg:flex-row-reverse',
        cell,
      )}
    >
      <Mark n={n} className="mt-[3px] lg:hidden" />
      <div className={cx('min-w-0 lg:max-w-[30ch]', side === 'start' ? 'lg:text-end' : 'lg:text-start')}>
        <h3 className="text-[16px] font-semibold leading-snug text-ink">{item.title}</h3>
        {item.body ? (
          <p className="mt-1 text-[15px] leading-relaxed text-pretty text-mute">{item.body}</p>
        ) : null}
      </div>
      <span aria-hidden="true" className="hidden h-px min-w-10 flex-1 bg-mute/45 lg:block" />
    </li>
  )
}

/** The number that ties a reason to its part: a small graphite tile (an order that carries meaning). */
function Mark({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-5 shrink-0 place-items-center rounded-[6px] bg-ink text-[11px] font-bold leading-none text-ground',
        className,
      )}
    >
      {n}
    </span>
  )
}

/** A skeleton word: a rounded bar the height of a lowercase letter. */
function Word({ className }: { className?: string }) {
  return <span className={cx('block h-[6px] shrink-0 rounded-full', className)} />
}

/** One row of the drawing; each pointed part in it wears its number across the drawing's edge. */
function Part({
  anchors,
  marks,
  className,
  children,
}: {
  anchors: Anchor[]
  marks: Partial<Record<Anchor, number>>
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('relative flex items-center', className)}>
      {children}
      {anchors.map((anchor) => (
        <EdgeMark key={anchor} anchor={anchor} n={marks[anchor]} />
      ))}
    </div>
  )
}

function EdgeMark({ anchor, n }: { anchor: Anchor; n?: number }) {
  if (!n) return null
  return (
    <Mark
      n={n}
      className={cx(
        'absolute top-1/2 z-10 -translate-y-1/2 ring-4 ring-ground',
        PARTS[anchor].side === 'start' ? '-start-[11px]' : '-end-[11px]',
      )}
    />
  )
}

/**
 * The brief bar, drawn flat: the field with its sentence and the language switch, the asked list,
 * the send row (in ink, not selection blue: a drawing never competes with a real Top Hit) and the
 * WhatsApp row. Skeleton words, so no copy and no profession is drawn. Decorative.
 */
function BriefDrawing({ marks }: { marks: Partial<Record<Anchor, number>> }) {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto max-w-[420px] rounded-[14px] border border-hair bg-panel-solid lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:mx-0 lg:grid lg:max-w-none lg:grid-rows-subgrid"
    >
      <Part
        anchors={['sentence', 'language']}
        marks={marks}
        className="min-h-14 gap-2 border-b border-hair px-4 lg:row-start-1"
      >
        <SearchIcon className="size-4 shrink-0 text-ink" />
        <Word className="w-8 bg-ink/70" />
        <span className="flex h-5 shrink-0 items-center rounded-[5px] bg-selected px-1.5">
          <Word className="w-10 bg-selected-ink/70" />
        </span>
        <Word className="w-4 bg-mute/45" />
        <span className="flex h-5 shrink-0 items-center rounded-[5px] bg-selected px-1.5">
          <Word className="w-7 bg-selected-ink/70" />
        </span>
        <span className="h-4 w-[1.5px] shrink-0 rounded-full bg-accent" />
        <span className="ms-auto grid size-7 shrink-0 place-items-center rounded-[7px] bg-tile text-tile-ink">
          <GlobeIcon className="size-4" />
        </span>
      </Part>
      <div className="flex flex-col justify-center gap-1 px-2 py-3 lg:row-start-2">
        <Word className="ms-2 mb-1 w-12 bg-mute/35" />
        {['w-24', 'w-16', 'w-20'].map((w) => (
          <span key={w} className="flex h-8 items-center gap-2.5 px-2">
            <span className="size-5 shrink-0 rounded-[5px] bg-tile" />
            <Word className={cx(w, 'bg-ink/40')} />
          </span>
        ))}
      </div>
      <Part anchors={['send']} marks={marks} className="border-t border-hair px-2 py-2 lg:row-start-3">
        <span className="flex h-11 flex-1 items-center gap-2.5 rounded-[9px] bg-ink px-2.5 text-ground">
          <span className="grid size-6 place-items-center rounded-[6px] bg-ground/20">
            <ForwardIcon className="size-3.5" />
          </span>
          <Word className="w-24 bg-ground/80" />
          <ReturnIcon className="ms-auto size-3.5 opacity-70" />
        </span>
      </Part>
      <Part anchors={['whatsapp']} marks={marks} className="gap-2.5 px-4 py-2.5 lg:row-start-4">
        <span className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-tile text-tile-ink">
          <WhatsAppIcon className="size-3.5" />
        </span>
        <Word className="w-28 bg-ink/45" />
      </Part>
    </div>
  )
}
