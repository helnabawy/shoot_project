import { HIRE_CREATOR_LIMIT, SITE_PATH, type HirePageV1, type LinkV1, type NavigationV1, type PageV1 } from '@shoot/domain/api/v1'
import { toWireBriefBuilder } from '@/modules/brief/wire'
import type { Lookups } from '@/modules/creators/describe'
import { toWireCreatorCard } from '@/modules/creators/wire'
import { toWireSections, type SectionContext } from '@/modules/landing/wire'
import { toWireLink, toWireRichText } from '@/shared/api/wire'
import type { Page } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import type { IntentPage } from './intent'
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

/**
 * A hire page (008 `hirePageV1`): the page's current address and text, its sections resolved like
 * the landing's, the brief builder with the page's preset, up to six fitting creators and the FAQ.
 */
export function toWireHirePage(intent: IntentPage, ctx: SectionContext & { directory: { lookups: Lookups; prefix: string } }): HirePageV1 {
  const { page } = intent
  const { lookups, prefix } = ctx.directory
  return {
    locale: ctx.locale,
    path: `/hire/${intent.slugs[ctx.locale]}`,
    title: page.title,
    intro: page.intent?.intro || null,
    sections: toWireSections(page.sections, ctx),
    builder: toWireBriefBuilder(intent.builder, ctx.locale).builder,
    preset: { ...intent.preset },
    creators: intent.creators.slice(0, HIRE_CREATOR_LIMIT).map((item) => toWireCreatorCard(item.creator, lookups, prefix, ctx)),
    creatorTotal: intent.creatorTotal,
    faq: intent.faq.map((f) => ({ question: f.question, answer: toWireRichText(f.answer, ctx.base) })),
  }
}

/** An editor-built page at its current address in the answer's language, with its resolved sections (FR-028). */
export function toWirePage(page: Pick<Page, 'title' | 'sections'>, path: string, ctx: SectionContext): PageV1 {
  return { locale: ctx.locale, path, title: page.title, sections: toWireSections(page.sections, ctx) }
}
