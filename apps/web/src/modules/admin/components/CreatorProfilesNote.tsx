import Link from 'next/link'

/** Says what Publish and Unpublish mean for a creator profile, and where to find who is waiting. */
export function CreatorProfilesNote() {
  return (
    <div style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, opacity: 0.9 }} data-testid="profiles-note">
      <p style={{ margin: 0 }}>
        <strong>Publish verifies a profile; Unpublish hides it.</strong> What you publish is exactly what you see on the edit screen, including the
        creator’s latest edits and samples. Compare versions from the Versions tab.
      </p>
      <p style={{ margin: '6px 0 0' }}>
        Pausing, suspending and featuring a creator live in{' '}
        <Link href="/admin/collections/creator-listings">Creator listings</Link>, and take effect at once without publishing anything. Creators waiting for
        review: <Link href="/admin/collections/creator-listings?where[or][0][and][0][submittedAt][exists]=true">Awaiting review</Link>.
      </p>
    </div>
  )
}
