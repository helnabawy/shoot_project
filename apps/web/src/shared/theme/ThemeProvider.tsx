'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

// On the client the script is inert: switching language remounts <html> and the provider, React
// cannot run a script it renders (and warns about it), and the provider's effect applies the theme.
const scriptProps = typeof window === 'undefined' ? undefined : { type: 'text/plain' }

/**
 * Light / dark / system theme. next-themes injects a tiny script before first paint so the
 * correct class is on <html> before React hydrates (no flash, FR-042).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  )
}
