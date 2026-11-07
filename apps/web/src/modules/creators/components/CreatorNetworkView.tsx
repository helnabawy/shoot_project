import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { SectionTitle } from '@/modules/landing/components/Section'
import type { CreatorListItem } from './CreatorList'
import { CreatorCard } from './CreatorCard'
import { NetworkStrip } from './NetworkStrip'

/**
 * "Our network" on the landing page: the heading in the page column, then the creators as preview
 * cards in a strip that runs the full width of the window, then the link to the directory.
 * Renders nothing until a creator is listed (Principle IV: a safe empty state, never invented cards).
 */
export function CreatorNetworkView({
  anchor,
  heading,
  subheading,
  items,
  cta,
}: {
  anchor?: string | null
  heading?: string | null
  subheading?: string | null
  items: CreatorListItem[]
  cta?: ReactNode
}) {
  const t = useTranslations('creators')
  if (items.length === 0) return null
  return (
    <section
      id={anchor ?? undefined}
      data-testid={anchor ? `section-${anchor}` : undefined}
      className="pt-16 lg:pt-24"
    >
      {heading || subheading ? (
        <div className="mx-auto max-w-[680px] px-4 sm:px-6 lg:max-w-[1080px]">
          <div className="lg:border-t lg:border-hair lg:pt-8">
            <SectionTitle heading={heading} subheading={subheading} />
          </div>
        </div>
      ) : null}
      <div className="mt-6 lg:mt-10">
        <NetworkStrip
          label={heading ?? ''}
          testId="creator-network"
          footer={cta}
          pauseLabel={t('network.pause')}
          playLabel={t('network.play')}
          items={items.map((item) => ({
            key: item.creator.id,
            node: <CreatorCard {...item} verifiedLabel={t('profile.verified')} />,
          }))}
        />
      </div>
    </section>
  )
}
