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

const IDENTITY_LABEL: Record<string, string> = { 'emirates-id': 'Emirates ID', 'trade-license': 'Trade license' }
const IDENTITY_STATUS: Record<string, string> = { pending: 'waiting for your check', verified: 'verified', rejected: 'not accepted' }

/** On a profile: the creator's identity documents and their status, so a reviewer checks them before publishing (CP-FR-013). */
export function ProfileIdentityDocuments() {
  const owner = useFormFields(([fields]) => fields.user?.value) as string | number | { id: string | number } | null | undefined
  const userId = typeof owner === 'object' && owner !== null ? owner.id : owner
  const [docs, setDocs] = useState<{ id: number; kind: string; status: string }[] | null>(null)
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetch(`/api/identity-documents?where[user][equals]=${userId}&sort=-createdAt&limit=20&depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (!cancelled) setDocs(result?.docs ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId])
  if (!userId || docs === null) return null
  // The newest upload of each kind is the one that counts.
  const latest = ['emirates-id', 'trade-license'].map((kind) => ({ kind, doc: docs.find((d) => d.kind === kind) ?? null }))
  return (
    <div style={{ padding: '12px 0', fontSize: 13, lineHeight: 1.5 }} data-testid="profile-identity-documents">
      <strong style={{ display: 'block', marginBottom: 4 }}>Identity documents</strong>
      {latest.map(({ kind, doc }) => (
        <span key={kind} style={{ display: 'block' }}>
          {IDENTITY_LABEL[kind]}:{' '}
          {doc ? <Link href={`/admin/collections/identity-documents/${doc.id}`}>{IDENTITY_STATUS[doc.status] ?? doc.status}</Link> : 'not uploaded'}
        </span>
      ))}
      <span style={{ display: 'block', opacity: 0.8 }}>Check both before publishing. Confidential: never shown on the site.</span>
    </div>
  )
}
