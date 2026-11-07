import { revalidatePath, revalidateTag } from 'next/cache'

type HookArgs = { doc?: unknown; req: { context?: { disableRevalidate?: boolean } } }

/** Revalidates a cache tag; outside a Next.js request (CLI scripts) there is nothing to revalidate. */
export function safeRevalidate(tag: string, path?: string): void {
  try {
    revalidateTag(tag, 'max')
    if (path) revalidatePath(path)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[revalidate] skipped ${tag}: ${(error as Error).message}`)
    }
  }
}

function shouldRun(args: HookArgs): boolean {
  return !args.req.context?.disableRevalidate
}

/** afterChange hook (collections and globals): revalidate `tag` and return the doc unchanged. */
export const revalidateTagAfterChange =
  (tag: string, path?: string) =>
  <T extends HookArgs>(args: T): T['doc'] => {
    if (shouldRun(args)) safeRevalidate(tag, path)
    return args.doc
  }

/** afterDelete hook for collections. */
export const revalidateTagAfterDelete =
  (tag: string) =>
  <T extends HookArgs>(args: T): T['doc'] => {
    if (shouldRun(args)) safeRevalidate(tag)
    return args.doc
  }

/** The landing page is cached under its tag and rendered at "/" and "/ar". */
export const revalidateLandingPage = revalidateTagAfterChange('landing-page', '/[locale]')
