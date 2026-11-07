import { inject, vi } from 'vitest'
import { TEST_ENV } from './global-setup'

Object.assign(process.env, TEST_ENV, { DATABASE_URI: inject('databaseUri') })

// Server-only modules and Next's cache run outside a Next.js request here.
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))
