import { headers } from 'next/headers'
import { NotFoundView } from '@/modules/pages/components/NotFoundView'
import { isRemovedPath } from '@/modules/pages'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { stripLocale } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'

const decode = (path: string) => {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** The reader's own language for a pathname such as /ar/studios or /studios. */
const localeOf = (pathname: string): Locale => (/^\/ar(\/|$)/.test(pathname) ? 'ar' : 'en')

/**
 * The page for any address we cannot serve. An address that used to be a page or a guide says "removed";
 * every other says "can't find". Drafts and unknown addresses look the same (a draft is never revealed).
 * A failing lookup must never turn a 404 into an error page, so every read here is allowed to fail.
 */
export default async function NotFound() {
  const pathname = decode((await headers()).get('x-pathname') ?? '/')
  const locale = localeOf(pathname)
  const path = stripLocale(pathname).replace(/\/+$/, '') || '/'
  const [removed, settings, hasGuides] = await Promise.all([
    isRemovedPath(locale, path).catch(() => false),
    getSiteSettings(locale).catch(() => null),
    import('@/modules/guides').then((guides) => guides.listArticles({ locale, page: 1 })).then((list) => list.total > 0).catch(() => false),
  ])
  return <NotFoundView variant={removed ? 'removed' : 'notFound'} locale={locale} whatsapp={{ number: settings?.whatsappNumber, message: settings?.whatsappDefaultMessage }} hasGuides={hasGuides} />
}
