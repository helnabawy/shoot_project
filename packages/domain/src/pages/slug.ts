/** Addresses an editor may not give a page: they belong to routes, files or the admin (research R4). */
export const RESERVED_SLUGS = [
  'login',
  'register',
  'account',
  'admin',
  'api',
  'next',
  'ar',
  'creators',
  'work',
  'book',
  'guides',
  'hire',
  'terms',
  'privacy',
  'sitemap.xml',
  'robots.txt',
  'feed',
  '_next',
] as const

export const SLUG_MAX_LENGTH = 80

export type SlugError = 'pages.slug.reserved' | 'pages.slug.invalid' | 'pages.slug.tooLong'

// Latin lower-case letters, digits and Arabic letters, joined by single dashes.
const SHAPE = /^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/

/** Trims, lower-cases Latin letters and collapses repeated dashes; never invents characters. */
export function normaliseSlug(input: string): string {
  return input.trim().toLowerCase().replace(/-{2,}/g, '-')
}

/** Null when `slug` can be a page address, else the message key explaining why not. */
export function validatePageSlug(slug: string): SlugError | null {
  if (slug.length > SLUG_MAX_LENGTH) return 'pages.slug.tooLong'
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return 'pages.slug.reserved'
  return SHAPE.test(slug) ? null : 'pages.slug.invalid'
}
