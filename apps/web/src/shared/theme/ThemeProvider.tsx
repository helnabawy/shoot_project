'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

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
    >
      {children}
    </NextThemesProvider>
  )
}
