'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Back from the payment page before the provider's notice arrived (FR-011, research R7): the server page is
 * read again every 3 s, up to a minute, so "paid" shows without the client reloading. Renders nothing.
 */
export function PaymentPending({ every = 3000, times = 20 }: { every?: number; times?: number }) {
  const router = useRouter()
  useEffect(() => {
    let left = times
    const timer = setInterval(() => {
      left -= 1
      router.refresh()
      if (left <= 0) clearInterval(timer)
    }, every)
    return () => clearInterval(timer)
  }, [router, every, times])
  return null
}
