import { facetCounts, filterCreators, orderCreators, paginate, sanitiseFilters, type CreatorSummary, type DirectoryFilters } from '@shoot/domain/creators'
import { localizeHref } from '@/shared/i18n/href'
import type { DirectoryContext } from './queries'

/** The query string of /creators; values are slugs, shared by both languages. */
export interface DirectoryParams {
  type?: string
  specialty?: string
  place?: string
  page?: string | number
}

export type FilterKey = 'type' | 'specialty' | 'place'

export interface FilterOptionView {
  slug: string
  name: string
  count: number
  selected: boolean
  href: string
}

export interface FilterGroupView {
  key: FilterKey
  options: FilterOptionView[]
  /** The "Any" row: this group cleared, the others kept. */
  anyHref: string
  /** Name of the chosen option, shown in the trailing slot. */
  current: string | null
}

export interface DirectoryView {
  groups: FilterGroupView[]
  /** Names of the chosen filters, printed as tokens in the field. */
  tokens: string[]
  clearHref: string | null
  /** The best match, promoted to the Top Hit (page 1 only). */
  topHit: CreatorSummary | null
  rows: CreatorSummary[]
  total: number
  page: number
  pages: number
  prevHref: string | null
  nextHref: string | null
  filtered: boolean
}

const KEYS: Record<FilterKey, 'personaId' | 'specialtyId' | 'emirateId'> = { type: 'personaId', specialty: 'specialtyId', place: 'emirateId' }

/** /creators?type=…&specialty=…&place=…&page=n, English unprefixed and Arabic under /ar. */
export function directoryHref(params: DirectoryParams, locale: string, base = '/creators'): string {
  const query = new URLSearchParams()
  if (params.type) query.set('type', params.type)
  if (params.specialty) query.set('specialty', params.specialty)
  if (params.place) query.set('place', params.place)
  const page = Number(params.page)
  if (Number.isFinite(page) && page > 1) query.set('page', String(Math.floor(page)))
  const qs = query.toString()
  return localizeHref(qs ? `${base}?${qs}` : base, locale)
}

/**
 * Turns URL params and the listed creators into everything the directory renders: filters (unknown
 * values ignored), faceted counts (zero-count options hidden unless chosen), the ordered matches,
 * the Top Hit and the page links (CP-US1-S2, surface brief creators-directory).
 */
export function buildDirectory({
  creators,
  context,
  params,
  locale,
  base = '/creators',
  fixed = {},
}: {
  creators: readonly CreatorSummary[]
  context: DirectoryContext
  params: DirectoryParams
  locale: string
  base?: string
  /** Filters that belong to the page itself (a specialty page), not to the query string. */
  fixed?: Partial<Record<FilterKey, string>>
}): DirectoryView {
  const bySlug = {
    type: context.personas,
    specialty: context.specialties,
    place: context.emirates,
  } as const
  const chosen: Partial<Record<FilterKey, string>> = {}
  for (const key of Object.keys(KEYS) as FilterKey[]) {
    const wanted = fixed[key] ?? params[key]
    if (wanted && bySlug[key].some((o) => o.slug === wanted)) chosen[key] = wanted
  }
  const idOf = (key: FilterKey, slug?: string) => bySlug[key].find((o) => o.slug === slug)?.id
  const filters: DirectoryFilters = sanitiseFilters(
    { personaId: idOf('type', chosen.type), specialtyId: idOf('specialty', chosen.specialty), emirateId: idOf('place', chosen.place) },
    { personaIds: context.personas.map((o) => o.id), specialtyIds: context.specialties.map((o) => o.id), emirateIds: context.emirates.map((o) => o.id) },
  )

  const counts = facetCounts(creators, filters, {
    personaIds: context.personas.map((o) => o.id),
    specialtyIds: context.specialties.map((o) => o.id),
    emirateIds: context.emirates.map((o) => o.id),
  })
  const countFor = { type: counts.personas, specialty: counts.specialties, place: counts.emirates }

  // A fixed filter is part of the page's path, so it never appears in the query string.
  const inQuery = Object.fromEntries(Object.entries(chosen).filter(([k]) => !(k in fixed)))
  const hrefFor = (over: Partial<DirectoryParams>) => directoryHref({ ...inQuery, ...over }, locale, base)
  const groups: FilterGroupView[] = (['type', 'specialty', 'place'] as const)
    .filter((key) => !fixed[key] && !(key === 'type' && context.personas.length < 2))
    .map((key) => {
      const options = bySlug[key]
        .map((o) => ({ slug: o.slug, name: o.name, count: countFor[key][o.id] ?? 0, selected: chosen[key] === o.slug, href: hrefFor({ [key]: o.slug, page: undefined }) }))
        .filter((o) => o.count > 0 || o.selected)
      return { key, options, anyHref: hrefFor({ [key]: undefined, page: undefined }), current: options.find((o) => o.selected)?.name ?? null }
    })

  const matches = orderCreators(filterCreators(creators, filters))
  const page = paginate(matches, Number(params.page), context.pageSize)
  const topHit = page.page === 1 ? (page.items[0] ?? null) : null
  const rows = topHit ? page.items.slice(1) : page.items
  const tokens = (Object.keys(KEYS) as FilterKey[]).filter((k) => chosen[k]).map((k) => bySlug[k].find((o) => o.slug === chosen[k])?.name ?? '')
  const set = Object.keys(chosen).filter((k) => !(k in fixed))

  return {
    groups,
    tokens,
    clearHref: set.length ? directoryHref({}, locale, base) : null,
    topHit,
    rows,
    total: page.total,
    page: page.page,
    pages: page.pages,
    prevHref: page.page > 1 ? hrefFor({ page: page.page - 1 }) : null,
    nextHref: page.page < page.pages ? hrefFor({ page: page.page + 1 }) : null,
    filtered: Object.keys(chosen).length > 0,
  }
}

export { orderCreators }
