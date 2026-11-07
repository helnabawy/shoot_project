import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Next.js 16 names the request interceptor `proxy.ts`. Locale negotiation: URL prefix, then the
// NEXT_LOCALE cookie, then Accept-Language, then English.
export default createMiddleware(routing)

export const config = {
  // Skip Payload (/admin, /api), preview routes (/next), Next internals and files with an extension.
  matcher: ['/((?!api|admin|next|_next|_vercel|.*\\..*).*)'],
}
