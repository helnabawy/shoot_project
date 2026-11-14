import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const negotiate = createMiddleware(routing)

// Next.js 16 names the request interceptor `proxy.ts`. Locale negotiation: URL prefix, then the
// NEXT_LOCALE cookie, then Accept-Language, then English.
//
// The requested path is forwarded as `x-pathname` so the not-found page, which gets no route
// params, can tell an address that used to be a page from one that never was (spec US5, research R6).
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-pathname', request.nextUrl.pathname)
  return negotiate(new NextRequest(request, { headers }))
}

export const config = {
  // Skip Payload (/admin, /api), preview routes (/next), Next internals and files with an extension.
  matcher: ['/((?!api|admin|next|_next|_vercel|\\.well-known|.*\\..*).*)'],
}
