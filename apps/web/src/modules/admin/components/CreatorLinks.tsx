'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/** On a profile: a link to its listing (pause, suspend, feature, review note). */
export function ProfileListingLink() {
  const { id, lastUpdateTime } = useDocumentInfo() as { id?: string | number; lastUpdateTime?: number }
  const [listingId, setListingId] = useState<string | number | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/creator-listings?where[profile][equals]=${id}&limit=1&depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (!cancelled) setListingId(result?.docs?.[0]?.id ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, lastUpdateTime])
  if (!listingId) return null
  return (
    <div style={{ padding: '12px 0', fontSize: 13, lineHeight: 1.5 }} data-testid="profile-listing-link">
      <strong style={{ display: 'block', marginBottom: 4 }}>Standing</strong>
      <Link href={`/admin/collections/creator-listings/${listingId}`}>Open this creator’s listing</Link>
      <span style={{ display: 'block', opacity: 0.8 }}>Suspend, feature or leave a note. It takes effect at once.</span>
    </div>
  )
}

/** On a listing: a link back to the profile it belongs to. */
export function ListingProfileLink() {
  const profile = useFormFields(([fields]) => fields.profile?.value) as string | number | { id: string | number } | null | undefined
  const id = typeof profile === 'object' && profile !== null ? profile.id : profile
  if (!id) return null
  return (
    <div style={{ padding: '12px 0', fontSize: 13, lineHeight: 1.5 }} data-testid="listing-profile-link">
      <strong style={{ display: 'block', marginBottom: 4 }}>Profile</strong>
      <Link href={`/admin/collections/creator-profiles/${id}`}>Open the profile to review or publish it</Link>
    </div>
  )
}
