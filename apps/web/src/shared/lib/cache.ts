import { unstable_cache } from 'next/cache'

/**
 * Cached server read tagged for on-demand revalidation. Payload hooks call revalidateTag(tag)
 * on publish, so changes are live without a rebuild (FR-014). `key` must include every input
 * that changes the result (locale, draft…), so English and Arabic are cached separately under
 * the same tag. `bypass` skips the cache (draft preview).
 */
export function cachedQuery<T>(
  tags: string[],
  key: readonly unknown[],
  fn: () => Promise<T>,
  options: { bypass?: boolean; revalidate?: number } = {},
): Promise<T> {
  if (options.bypass) return fn()
  return unstable_cache(fn, ['q', ...tags, JSON.stringify(key)], {
    tags,
    revalidate: options.revalidate ?? false,
  })()
}
