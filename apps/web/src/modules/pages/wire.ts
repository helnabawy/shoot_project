import { SITE_PATH, type LinkV1, type NavigationV1 } from '@shoot/domain/api/v1'
import { toWireLink } from '@/shared/api/wire'
import type { Locale } from '@/shared/lib/locale'
import type { Navigation, NavigationLink } from './queries'

/** Site links only: a link whose address is not a site path is left out rather than sent broken. */
const links = (items: readonly NavigationLink[]): LinkV1[] =>
  items.map(toWireLink).filter((l) => SITE_PATH.test(l.path))

/** Header pages, footer groups and the legal links, as the website's chrome shows them (FR-021). */
export function toWireNavigation(navigation: Navigation, locale: Locale): NavigationV1 {
  return {
    locale,
    header: links(navigation.header),
    footerGroups: navigation.footerGroups.map((g) => ({ key: g.key, label: g.label, links: links(g.links) })),
    legal: links(navigation.legal),
  }
}
