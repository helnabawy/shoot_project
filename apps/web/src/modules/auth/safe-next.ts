/** Only same-site relative paths may be used as a post-login destination (no open redirects). */
export function safeNext(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  // Strip a locale prefix; the locale-aware redirect adds the right one.
  return value.replace(/^\/ar(?=\/|$)/, '') || '/'
}
