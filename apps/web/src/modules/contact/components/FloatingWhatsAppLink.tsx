'use client'

import { useEffect, useState } from 'react'
import { WhatsAppIcon } from '@/shared/ui/icons'
import { cx } from '@/shared/ui/bar'

/**
 * The phone's always-reachable WhatsApp button. It steps aside while the brief panel is on screen,
 * which already offers WhatsApp, so it never covers the panel's rows (FR-011, FR-061).
 */
export function FloatingWhatsAppLink({ href, label }: { href: string; label: string }) {
  const [covered, setCovered] = useState(false)

  useEffect(() => {
    const targets = document.querySelectorAll('[data-floating-hide]')
    if (targets.length === 0 || typeof IntersectionObserver === 'undefined') return
    const visible = new Set<Element>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else visible.delete(entry.target)
      }
      setCovered(visible.size > 0)
    })
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      aria-hidden={covered || undefined}
      tabIndex={covered ? -1 : undefined}
      data-testid="whatsapp-floating"
      data-covered={covered || undefined}
      className={cx(
        'fixed end-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 grid size-12 place-items-center rounded-full bg-ink text-ground shadow-[var(--shadow)] motion-safe:transition-[opacity,translate] motion-safe:duration-200 motion-safe:active:scale-95 md:hidden',
        covered && 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <WhatsAppIcon width={22} height={22} />
    </a>
  )
}
