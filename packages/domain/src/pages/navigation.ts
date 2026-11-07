/** Limits on what editors can place in the chrome (spec edge cases, research R7). */
export const HEADER_PAGE_LIMIT = 3
export const FOOTER_GROUP_LIMIT = 4
export const FOOTER_LINK_LIMIT = 24

export interface PlacementPage {
  id: string
  title: string
  /** The localised nav label; the title is used when it is empty. */
  label?: string | null
  inHeader: boolean
  footerGroup?: string | null
  order: number
}

export interface FooterGroupDef {
  key: string
  label: string
}

export type PlacementError = 'pages.nav.headerLimit' | 'pages.nav.unknownGroup' | 'pages.nav.footerLimit'

const labelOf = (p: PlacementPage): string => p.label || p.title
const byOrder = (a: PlacementPage, b: PlacementPage): number => a.order - b.order || labelOf(a).localeCompare(labelOf(b))

/** Checks a page's placement against the other published pages; null when it fits. */
export function checkPlacementLimits(
  existing: readonly PlacementPage[],
  candidate: PlacementPage,
  groupKeys: readonly string[],
): PlacementError | null {
  const others = existing.filter((p) => p.id !== candidate.id)
  if (candidate.footerGroup && !groupKeys.includes(candidate.footerGroup)) return 'pages.nav.unknownGroup'
  if (candidate.inHeader && others.filter((p) => p.inHeader).length + 1 > HEADER_PAGE_LIMIT) return 'pages.nav.headerLimit'
  if (candidate.footerGroup && others.filter((p) => p.footerGroup).length + 1 > FOOTER_LINK_LIMIT) return 'pages.nav.footerLimit'
  return null
}

/** Header pages in display order. */
export function orderHeader(pages: readonly PlacementPage[]): { id: string; label: string }[] {
  return pages
    .filter((p) => p.inHeader)
    .sort(byOrder)
    .map((p) => ({ id: p.id, label: labelOf(p) }))
}

/** Footer groups in the editor's order, each with its pages in display order; empty groups are dropped. */
export function groupFooter(
  pages: readonly PlacementPage[],
  groups: readonly FooterGroupDef[],
): { key: string; label: string; links: { id: string; label: string }[] }[] {
  return groups
    .slice(0, FOOTER_GROUP_LIMIT)
    .map((g) => ({
      key: g.key,
      label: g.label,
      links: pages
        .filter((p) => p.footerGroup === g.key)
        .sort(byOrder)
        .map((p) => ({ id: p.id, label: labelOf(p) })),
    }))
    .filter((g) => g.links.length > 0)
}
