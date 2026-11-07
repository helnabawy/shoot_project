'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CloseIcon, MenuIcon } from '@/shared/ui/icons'

/** Phone menu: a disclosure with Escape to close; closes on navigation. */
export function MobileMenu({ children, openLabel, closeLabel }: { children: ReactNode; openLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  // Close on navigation (adjusting state while rendering, not in an effect).
  const [seenPath, setSeenPath] = useState(pathname)
  if (pathname !== seenPath) {
    setSeenPath(pathname)
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? closeLabel : openLabel}
        data-testid="nav-mobile-toggle"
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-lg text-ink hover:bg-ink/5"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      <div
        id={id}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) setOpen(false)
        }}
        className="absolute inset-x-3 top-[58px] z-50"
      >
        {children}
      </div>
    </div>
  )
}
