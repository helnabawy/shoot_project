'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * 022 (research R9, FR-023): keeps a server-rendered list live without a realtime service. While the tab is
 * visible it asks `check` for the list's fingerprint every few seconds and reloads the server page only when
 * it changes; it stops after a long quiet spell. Renders nothing; without JavaScript the page is simply static.
 */
export function LiveRefresh({ stamp, check, every = 3000, quietMs = 30 * 60 * 1000 }: { stamp: string; check: () => Promise<string | null>; every?: number; quietMs?: number }) {
  const router = useRouter()
  const known = useRef(stamp)
  const lastChange = useRef(0)

  useEffect(() => {
    known.current = stamp
    lastChange.current = Date.now()
  }, [stamp])

  useEffect(() => {
    let busy = false
    const timer = setInterval(async () => {
      if (busy || document.visibilityState !== 'visible') return
      if (Date.now() - lastChange.current > quietMs) return clearInterval(timer)
      busy = true
      try {
        const next = await check()
        if (next && next !== known.current) {
          known.current = next
          lastChange.current = Date.now()
          router.refresh()
        }
      } catch {
        // A missed check is retried on the next tick.
      } finally {
        busy = false
      }
    }, every)
    return () => clearInterval(timer)
  }, [router, check, every, quietMs])

  return null
}
