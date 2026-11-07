'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The header's section links, marking where the visitor is: the landing section under the header
 * gets `aria-current="location"`, a page link to the current page `aria-current="page"`. The links
 * are server-rendered and work unchanged without JavaScript; this only adds the marker.
 */
export function SectionNav({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const nav = ref.current
    if (!nav) return
    const links = Array.from(nav.querySelectorAll('a'))
    for (const a of links) {
      if (!a.hash && a.pathname === window.location.pathname) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    }

    const anchored = links
      .map((a) => ({
        a,
        target: a.hash ? document.getElementById(decodeURIComponent(a.hash.slice(1))) : null,
      }))
      .filter(
        (x): x is { a: HTMLAnchorElement; target: HTMLElement } =>
          x.target !== null && x.a.pathname === window.location.pathname,
      )
    if (anchored.length === 0 || typeof IntersectionObserver === 'undefined') return

    const inView = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target)
          else inView.delete(e.target)
        }
        // The first linked section, in page order, crossing the band just under the header.
        const current = anchored.find(({ target }) => inView.has(target))
        for (const { a } of anchored) {
          if (a === current?.a) a.setAttribute('aria-current', 'location')
          else a.removeAttribute('aria-current')
        }
      },
      { rootMargin: '-72px 0px -55% 0px' },
    )
    for (const { target } of anchored) observer.observe(target)
    return () => observer.disconnect()
  }, [pathname])

  return (
    <nav ref={ref} aria-label={label} className={className}>
      {children}
    </nav>
  )
}
