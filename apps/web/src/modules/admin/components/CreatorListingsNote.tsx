import Link from 'next/link'

const filter = (field: string, operator: string, value: string) => `/admin/collections/creator-listings?where[or][0][and][0][${field}][${operator}]=${value}`

/** Filters for the review queue, and the rule that standing never publishes pending edits. */
export function CreatorListingsNote() {
  const links = [
    ['Awaiting review', filter('submittedAt', 'exists', 'true')],
    ['Suspended', filter('suspended', 'equals', 'true')],
    ['Featured', filter('featured', 'equals', 'true')],
    ['Paused by the creator', filter('active', 'equals', 'false')],
    ['Everyone', '/admin/collections/creator-listings'],
  ] as const
  return (
    <div style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, opacity: 0.9 }} data-testid="listings-note">
      <p style={{ margin: 0 }}>
        <strong>Suspend and Feature take effect at once and never publish a creator’s pending edits.</strong> To verify someone, open their profile in{' '}
        <Link href="/admin/collections/creator-profiles">Creator profiles</Link> and publish it.
      </p>
      <p style={{ margin: '6px 0 0', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {links.map(([label, href]) => (
          <Link key={label} href={href}>
            {label}
          </Link>
        ))}
      </p>
    </div>
  )
}
