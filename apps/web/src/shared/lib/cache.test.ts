import { unstable_cache } from 'next/cache'
import { describe, expect, it, vi } from 'vitest'
import { cachedQuery } from './cache'

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: () => Promise<unknown>) => fn),
}))

describe('cachedQuery', () => {
  it('caches under the tags with a key that includes the locale', async () => {
    const fn = vi.fn(async () => 'ok')
    await expect(cachedQuery(['landing-page'], [{ locale: 'ar' }], fn)).resolves.toBe('ok')
    expect(unstable_cache).toHaveBeenCalledWith(fn, ['q', 'landing-page', '[{"locale":"ar"}]'], {
      tags: ['landing-page'],
      revalidate: false,
    })
  })

  it('in development, expires after a few seconds so publishes from another server show up', async () => {
    vi.mocked(unstable_cache).mockClear()
    vi.stubEnv('NODE_ENV', 'development')
    try {
      await cachedQuery(['landing-page'], [], async () => 'dev')
      expect(vi.mocked(unstable_cache).mock.calls[0]?.[2]).toEqual({ tags: ['landing-page'], revalidate: 5 })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('bypasses the cache in draft mode', async () => {
    vi.mocked(unstable_cache).mockClear()
    const fn = vi.fn(async () => 'draft')
    await expect(cachedQuery(['landing-page'], [], fn, { bypass: true })).resolves.toBe('draft')
    expect(unstable_cache).not.toHaveBeenCalled()
  })
})
