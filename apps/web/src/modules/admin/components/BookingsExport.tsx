'use client'

import { useSearchParams } from 'next/navigation'

/** QM-US4-S3: download the bookings list as CSV, keeping a state filter chosen in the list (where[state][equals]). */
export function BookingsExport() {
  const params = useSearchParams()
  const state = params?.get('where[state][equals]') ?? params?.get('where[or][0][and][0][state][equals]') ?? ''
  const href = `/api/bookings/export.csv${state ? `?state=${encodeURIComponent(state)}` : ''}`
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 12px' }}>
      <a href={href} className="btn btn--style-secondary btn--size-small" download>
        Download CSV{state ? ` (${state})` : ''}
      </a>
    </div>
  )
}
