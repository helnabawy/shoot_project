'use client'

import { useLayoutEffect, useSyncExternalStore } from 'react'

// Adds .js to <html> before first paint so JavaScript-only controls never flash or shift.
const SCRIPT = `document.documentElement.classList.add('js')`
const subscribe = () => () => {}

/**
 * Puts `.js` on <html>. The inline script ships in the server HTML (and is kept through hydration)
 * so the class is there before first paint. A client render — switching language remounts <html> —
 * never creates it: React cannot run a script it renders and warns about it, and the layout effect
 * adds the class instead.
 */
export function JsFlag() {
  const inServerHtml = useSyncExternalStore(subscribe, () => false, () => true)
  useLayoutEffect(() => {
    document.documentElement.classList.add('js')
  }, [])
  return inServerHtml ? <script dangerouslySetInnerHTML={{ __html: SCRIPT }} /> : null
}
