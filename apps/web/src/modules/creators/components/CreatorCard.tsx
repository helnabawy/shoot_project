import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CreatorSummary } from '@shoot/domain/creators'
import { Bidi } from '@/shared/ui/Bidi'
import { CheckIcon, ForwardIcon, PinIcon, TagIcon, UserIcon } from '@/shared/ui/icons'
import type { CreatorRowView } from '../describe'
import { PhotoTile } from './PhotoTile'

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-2 text-[13px] leading-5 text-mute">
      <span className="text-tile-ink">{icon}</span>
      <span className="truncate">{children}</span>{' '}
    </span>
  )
}

/**
 * A creator as a Spotlight preview pane: the photo tile and name over a short excerpt of their bio,
 * then the facts as glyph lines (types, place, specialties as plain text, never pills). Used where
 * creators pass by as a strip (the landing "Our network" block). The whole card is one link.
 */
export function CreatorCard({
  creator,
  view,
  href,
  verifiedLabel,
}: {
  creator: CreatorSummary
  view: CreatorRowView
  href: string
  /** Accessible name of the check beside the name; every listed profile was checked before listing. */
  verifiedLabel: string
}) {
  return (
    <Link
      href={href}
      data-testid="creator-card"
      data-code={creator.code}
      className="creator-card group flex h-full flex-col rounded-[14px] border border-hair bg-panel-solid p-5 text-start"
    >
      <span className="grid grid-cols-[64px_minmax(0,1fr)_20px] items-center gap-4">
        <PhotoTile photo={creator.photo} initials={view.initials} size="lg" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink">
              {view.name}
            </span>{' '}
            <span
              role="img"
              aria-label={verifiedLabel}
              className="grid size-4 shrink-0 place-items-center rounded-full bg-ink text-ground"
            >
              <CheckIcon width={11} height={11} strokeWidth={2.5} />
            </span>
          </span>{' '}
          <span className="mt-0.5 block text-[13px] tabular-nums text-mute">
            <Bidi>{view.displayCode}</Bidi>
          </span>
        </span>{' '}
        <ForwardIcon
          width={18}
          height={18}
          className="self-start text-mute transition-[translate,color] duration-200 ease-out group-hover:text-ink motion-safe:group-hover:translate-x-0.5 motion-safe:rtl:group-hover:-translate-x-0.5"
        />
      </span>
      {creator.bio ? (
        <span
          dir="auto"
          className="mt-4 line-clamp-2 min-h-[2lh] text-[14px] leading-relaxed text-pretty text-ink/80"
        >
          {creator.bio}
        </span>
      ) : null}{' '}
      {/* Holds the facts to the card's foot, so every card in the strip lines them up. */}
      <span aria-hidden="true" className="min-h-4 flex-1" />
      <span className="flex flex-col gap-1.5 border-t border-hair pt-4">
        {view.types ? <Meta icon={<UserIcon width={16} height={16} />}>{view.types}</Meta> : null}
        {view.place ? <Meta icon={<PinIcon width={16} height={16} />}>{view.place}</Meta> : null}
        {view.specialties ? (
          <Meta icon={<TagIcon width={16} height={16} />}>{view.specialties}</Meta>
        ) : null}
      </span>
    </Link>
  )
}
