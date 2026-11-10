import Image from 'next/image'
import Link from 'next/link'
import type { CreatorListItem } from '@/modules/creators'
import { Bidi } from '@/shared/ui/Bidi'

/** Below this many the columns stay away: a loop of three shows the same face twice at once. */
export const HERO_CREATORS_MIN = 4
/** Each column holds at most this many before it repeats. */
const PER_COLUMN = 8

/**
 * A creator as it passes in the hero columns: the photo (or a scene tile with their initials when
 * there is none), the name, what they do and where, and their code. The whole card is one link.
 */
function HeroCreatorCard({ item, hidden }: { item: CreatorListItem; hidden?: boolean }) {
  const { creator, view, href } = item
  const facts = [view.types, view.place].filter(Boolean).join(' · ')
  return (
    <Link
      href={href}
      tabIndex={hidden ? -1 : undefined}
      className="group mb-4 flex w-[220px] flex-col gap-0.5 rounded-[14px] border border-hair bg-panel-solid p-2 pb-3 text-ink shadow-panel"
    >
      <span aria-hidden="true" className="scene-tile relative mb-2 grid h-[132px] place-items-center overflow-hidden rounded-[10px]">
        {creator.photo ? (
          <Image src={creator.photo.url} alt="" fill sizes="204px" className="object-cover" />
        ) : (
          <span className="text-[28px] font-bold tracking-[-0.02em] text-[var(--scene-ink)]">{view.initials}</span>
        )}
      </span>
      <span className="truncate px-1 text-[16px] font-semibold leading-snug">{view.name}</span>
      {facts ? <span className="truncate px-1 text-[13px] leading-snug text-mute">{facts}</span> : null}
      <span className="px-1 pt-1.5 text-[13px] tabular-nums text-mute">
        <Bidi>{view.displayCode}</Bidi>
      </span>
    </Link>
  )
}

/**
 * The hero's creator columns from 1280 px (design 41 · Landing · 1440): real creators in two slow
 * columns, one rising and one falling, on the end side of the stage. The first column's list is read
 * once by assistive tech; its loop copy and the whole second column are hidden and inert. Hover or
 * focus holds them, the page's Pause control stops them, reduced motion stills them. Renders nothing
 * until there are enough real creators to fill them (PRODUCT.md: never invented cards).
 */
export function HeroCreators({ items, label, className }: { items: CreatorListItem[]; label: string; className?: string }) {
  if (items.length < HERO_CREATORS_MIN) return null
  const first = items.slice(0, PER_COLUMN)
  const half = Math.ceil(first.length / 2)
  const second = [...first.slice(half), ...first.slice(0, half)]
  return (
    <div data-testid="hero-creators" className={`hero-creators gap-4 ${className ?? ''}`}>
      <div className="hero-creators-col">
        <div className="hero-creators-track">
          <ul aria-label={label}>
            {first.map((item) => (
              <li key={item.creator.id}>
                <HeroCreatorCard item={item} />
              </li>
            ))}
          </ul>
          <ul aria-hidden="true" inert>
            {first.map((item) => (
              <li key={item.creator.id}>
                <HeroCreatorCard item={item} hidden />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="hero-creators-col hero-creators-col-down" aria-hidden="true" inert>
        <div className="hero-creators-track">
          {[0, 1].map((copy) => (
            <ul key={copy}>
              {second.map((item) => (
                <li key={item.creator.id}>
                  <HeroCreatorCard item={item} hidden />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
