import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// The brief bar's match preview is a server action (003 US1-S7); component tests never reach the server.
vi.mock('@/modules/booking/preview-action', () => ({ previewMatches: async () => null }))

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
  draftMode: async () => ({ isEnabled: false }),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}))

// jsdom lacks matchMedia and IntersectionObserver; components that read them get inert stubs.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList
}
if (!('IntersectionObserver' in window)) {
  class IO {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  }
  ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO
}

// jsdom does not implement scrolling.
Element.prototype.scrollIntoView = vi.fn()
