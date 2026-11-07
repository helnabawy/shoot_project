import type { ReactNode } from 'react'

/** Keeps phone numbers, emails and URLs left-to-right inside Arabic text. */
export function Bidi({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>
}
