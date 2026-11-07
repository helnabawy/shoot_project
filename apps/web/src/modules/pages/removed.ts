import type { Payload } from 'payload'

type Locale = 'en' | 'ar'

/** Marks `path` (without language prefix) as removed in each locale; replaces an older mark. */
export async function recordRemovedPath(payload: Payload, input: { kind: 'page' | 'article'; paths: Partial<Record<Locale, string>> }): Promise<void> {
  const quiet = { disableRevalidate: true }
  for (const locale of ['en', 'ar'] as const) {
    const path = input.paths[locale]
    if (!path) continue
    await clearRemovedPath(payload, locale, path)
    await payload.create({
      collection: 'removed-paths',
      data: { kind: input.kind, locale, path, removedAt: new Date().toISOString() },
      overrideAccess: true,
      context: quiet,
    })
  }
  const { safeRevalidate } = await import('@/shared/payload/hooks/revalidate')
  safeRevalidate('removed-paths')
}

/** Forgets a removed mark, because the address is used again. */
export async function clearRemovedPath(payload: Payload, locale: Locale, path: string): Promise<void> {
  await payload.delete({
    collection: 'removed-paths',
    where: { and: [{ locale: { equals: locale } }, { path: { equals: path } }] },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
}
