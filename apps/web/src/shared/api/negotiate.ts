import { DEFAULT_LOCALE, isLocale, type Locale } from '@/shared/lib/locale'

/**
 * Pure readers of an API request (008 research R4, R5): the answer language, the install id, the
 * client address and the request id. They read values, never `next/headers`.
 */

/** The answer language and whether an explicit `?locale=` was unsupported (a 422 field issue). */
export function negotiateLocale(query: string | string[] | undefined, acceptLanguage: string | null): { locale: Locale; invalid: boolean } {
  const fromHeader = fromAcceptLanguage(acceptLanguage)
  if (query === undefined) return { locale: fromHeader, invalid: false }
  return isLocale(query) ? { locale: query, invalid: false } : { locale: fromHeader, invalid: true }
}

/** First supported language by weight (primary subtag only, so `ar-AE` is `ar`); English otherwise. */
function fromAcceptLanguage(header: string | null): Locale {
  const ranked = (header ?? '')
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const weight = q === undefined ? 1 : Number(q.slice(2))
      return { lang: tag.trim().split('-')[0]?.toLowerCase() ?? '', weight: Number.isNaN(weight) ? 1 : weight, index }
    })
    .filter((r) => r.weight > 0 && isLocale(r.lang))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
  return (ranked[0]?.lang as Locale | undefined) ?? DEFAULT_LOCALE
}

const INSTALL_ID = /^[0-9a-f]{32}$/

/** The `X-Shoot-Install` id when it is 32 lower-case hex characters; anything else is ignored. */
export function readInstallId(header: string | null): string | null {
  return header && INSTALL_ID.test(header) ? header : null
}

/** The first `x-forwarded-for` address, else `x-real-ip`, else `null`. */
export function clientAddressOf(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip')?.trim() || null
}

/** What limits and duplicate checks count by: the install, else the address, else `anonymous`. */
export function visitorKeyOf(installId: string | null, clientAddress: string | null): string {
  return installId ? `install:${installId}` : (clientAddress ?? 'anonymous')
}

const REQUEST_ID = /^[\w-]{8,64}$/

/** The caller's `X-Request-Id` when it is safe to echo, else a new one. */
export function requestIdOf(header: string | null): string {
  return header && REQUEST_ID.test(header) ? header : crypto.randomUUID()
}
