'use client'

import { useLayoutEffect } from 'react'

/**
 * Keeps `.js` on <html> after a client-side locale switch. The inline head script adds it before
 * first paint, but switching language remounts <html> and React never re-runs that script.
 */
export function JsFlag() {
  useLayoutEffect(() => {
    document.documentElement.classList.add('js')
  }, [])
  return null
}
