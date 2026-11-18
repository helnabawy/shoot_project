import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { accountTypeHint, PAYLOAD_TOKEN_COOKIE } from './shared/auth/token-hint'

const negotiate = createMiddleware(routing)

// Next.js 16 names the request interceptor `proxy.ts`. Locale negotiation: URL prefix, then the
// NEXT_LOCALE cookie, then Accept-Language, then English.
//
// The requested path is forwarded as `x-pathname` so the not-found page, which gets no route
// params, can tell an address that used to be a page from one that never was (spec US5, research R6).
//
// Feature 023 (research R1): a session token that says "provider" sends `/` and `/ar` to the creator home
// (`/creator-home`, `/ar/creator-home`) while the visitor's address stays as it is, so the landing stays
// statically generated for everyone else. The token is only a hint, read without verifying it and without
// a database call; the creator home page checks the real session. `?view=client` opts out, which is how a
// creator reaches the client page.
const HOME_PATHS = new Set(['/', '/ar'])

export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const headers = new Headers(request.headers)
  headers.set('x-pathname', pathname)
  const forwarded = new NextRequest(request, { headers })
  const response = negotiate(forwarded)

  const swap =
    HOME_PATHS.has(pathname) &&
    !searchParams.has('view') &&
    accountTypeHint(request.cookies.get(PAYLOAD_TOKEN_COOKIE)?.value) === 'provider'
  // A redirect (to the visitor's own language, say) is next-intl's to make; the swap happens on the next request.
  if (!swap || (response.status >= 300 && response.status < 400)) return response

  // The query travels with the swap: the page reads `?decline=` (a request's reason step) and `?error=` (a refused answer).
  const target = new URL(pathname === '/ar' ? '/ar/creator-home' : '/creator-home', request.url)
  target.search = request.nextUrl.search
  const swapped = negotiate(new NextRequest(target, { headers }))
  // `next()` answers (an Arabic path) carry no rewrite header, so name the final address explicitly.
  if (!swapped.headers.has('x-middleware-rewrite')) swapped.headers.set('x-middleware-rewrite', target.toString())
  // The alternate-language links describe the address the visitor asked for, not the page it is swapped for.
  const alternates = response.headers.get('link')
  if (alternates) swapped.headers.set('link', alternates)
  else swapped.headers.delete('link')
  return swapped
}

export const config = {
  // Skip Payload (/admin, /api), preview routes (/next), Next internals and files with an extension.
  matcher: ['/((?!api|admin|next|_next|_vercel|\\.well-known|.*\\..*).*)'],
}
