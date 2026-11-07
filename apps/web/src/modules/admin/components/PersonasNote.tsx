import Link from 'next/link'

/** Explains that creating a persona does not show it until it is activated in Site Settings. */
export function PersonasNote() {
  return (
    <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.85 }}>
      A new persona appears on the site once it is active and listed in <Link href="/admin/globals/site-settings">Site settings → Audience</Link>.
      Deactivate personas instead of deleting them; existing accounts keep their profession.
    </p>
  )
}
