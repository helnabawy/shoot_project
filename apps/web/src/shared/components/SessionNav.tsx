'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserIcon } from '@/shared/ui/icons'
import { RowContent } from '@/shared/ui/bar'

export interface SessionUser {
  name: string
  avatarUrl: string | null
}

// One request per page, shared by every island in the header (desktop and phone menu). It is
// refreshed on navigation, so logging in or out (a redirect) updates the header.
let pending: Promise<SessionUser | null> | null = null
let pendingFor: string | null = null
function loadSession(pathname: string): Promise<SessionUser | null> {
  if (pending && pendingFor === pathname) return pending
  pendingFor = pathname
  pending = fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ user: SessionUser | null }>) : { user: null }))
    .then((b) => b.user)
    .catch(() => null)
  return pending
}

/** Test seam: forget the cached session. */
export function resetSession() {
  pending = null
  pendingFor = null
}

function useSession(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(null)
  const pathname = usePathname()
  useEffect(() => {
    let live = true
    loadSession(pathname).then((u) => live && setUser(u))
    return () => {
      live = false
    }
  }, [pathname])
  return user
}

function initialOf(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? ''
}

export function Avatar({ user, size = 26 }: { user: SessionUser; size?: number }) {
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- a 26 px thumbnail, already resized by Payload
    <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-ground"
      style={{ width: size, height: size }}
    >
      {initialOf(user.name)}
    </span>
  )
}

/** A header link shown only to signed-in members (e.g. Bookings). */
export function MemberLink({ href, label, className, row }: { href: string; label: string; className?: string; row?: boolean }) {
  const user = useSession()
  const pathname = usePathname()
  if (!user) return null
  return (
    <Link href={href} className={className} aria-current={pathname === href ? 'page' : undefined}>
      {row ? <RowContent glyph={label.slice(0, 1)} label={label} /> : label}
    </Link>
  )
}

/**
 * The account entry: "Log in" for visitors (server-rendered, works without JavaScript), the
 * member's avatar linking to their account once the session is known.
 */
export function AccountLink({
  loginHref,
  accountHref,
  loginLabel,
  accountLabel,
  className,
  avatarClassName,
  row,
}: {
  loginHref: string
  accountHref: string
  loginLabel: string
  accountLabel: string
  className?: string
  avatarClassName?: string
  row?: boolean
}) {
  const user = useSession()
  if (!user) {
    return (
      <Link href={loginHref} className={className}>
        {row ? (
          <RowContent glyph={<UserIcon width={16} height={16} />} label={loginLabel} />
        ) : (
          <>
            <UserIcon width={16} height={16} />
            {loginLabel}
          </>
        )}
      </Link>
    )
  }
  if (row) {
    return (
      <Link href={accountHref} className={className}>
        <RowContent glyph={<Avatar user={user} size={22} />} label={accountLabel} />
      </Link>
    )
  }
  return (
    <Link href={accountHref} className={avatarClassName} aria-label={`${accountLabel}: ${user.name}`} title={user.name}>
      <Avatar user={user} />
    </Link>
  )
}
