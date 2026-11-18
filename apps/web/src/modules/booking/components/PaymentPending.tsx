'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Back from the payment page before the provider's notice arrived (FR-011, research R7): the server page is
 * read again every 3 s, up to a minute, so "paid" shows without the client reloading. When the minute passes
 * with no notice, the line stops promising seconds and says it is taking longer (PY-US1-S4), so a client who
 * paid is not left watching a pulse forever and is not offered Pay again.
 */
export function PaymentPending({ pending, late, every = 3000, times = 20 }: { pending: string; late: string; every?: number; times?: number }) {
  const router = useRouter()
  const [waiting, setWaiting] = useState(true)
  useEffect(() => {
    let left = times
    const timer = setInterval(() => {
      left -= 1
      router.refresh()
      if (left <= 0) {
        clearInterval(timer)
        setWaiting(false)
      }
    }, every)
    return () => clearInterval(timer)
  }, [router, every, times])
  return (
    <div role="status" data-testid="quote-payment-pending" data-late={waiting ? undefined : 'true'} className="flex items-start gap-3 px-4 pb-2">
      <span aria-hidden="true" className={`mt-[8px] size-2 shrink-0 rounded-full ${waiting ? 'animate-pulse bg-accent motion-reduce:animate-none' : 'bg-mute'}`} />
      <p className="text-[15px] text-ink">{waiting ? pending : late}</p>
    </div>
  )
}
