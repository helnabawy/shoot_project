import type { ReactNode } from 'react'
import { Section } from '@/modules/landing/components/Section'
import { CreatorList, type CreatorListItem } from './CreatorList'

/** "Our network" on the landing page: creators as rows on the ground, then the link to the directory. */
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
  if (items.length === 0) return null
  return (
    <Section id={anchor} heading={heading} subheading={subheading}>
      <CreatorList items={items} label={heading ?? ''} testId="creator-network" />
      {cta ? <div className="mt-4 -mx-2">{cta}</div> : null}
    </Section>
  )
}
