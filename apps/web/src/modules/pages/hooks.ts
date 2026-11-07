import { lexicalToText } from '@shoot/domain/content'
import { checkPlacementLimits, intentHasTarget, type PlacementPage } from '@shoot/domain/pages'
import {
  APIError,
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'
import { audiencePersonaIds } from '@/modules/creators/hooks'
import { safeRevalidate } from '@/shared/payload/hooks/revalidate'
import { pageError } from './messages'
import { clearRemovedPath, recordRemovedPath } from './removed'

type Locale = 'en' | 'ar'
type Row = Record<string, unknown>

/**
 * Local API calls that are given `req` and a different `locale` change that locale on the shared
 * request, so the write in progress would land in the wrong language. Reads in a hook go through this.
 */
async function reading<T>(req: PayloadRequest, read: () => Promise<T>): Promise<T> {
  const { locale, fallbackLocale } = req
  try {
    return await read()
  } finally {
    req.locale = locale
    req.fallbackLocale = fallbackLocale
  }
}

const localeOf = (req: PayloadRequest): Locale | null => (req.locale === 'en' || req.locale === 'ar' ? req.locale : null)
const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const sitePath = (kind: unknown, slug: string): string => (kind === 'intent' ? `/hire/${slug}` : `/${slug}`)

function fail(req: PayloadRequest, errors: { path: string; message: string }[]): never {
  throw new ValidationError({ collection: 'pages', errors, req })
}

/** Placement of the other published standard pages, for the header/footer limits (research R7). */
async function otherPlacements(req: PayloadRequest): Promise<PlacementPage[]> {
  const { docs } = await reading(req, () =>
    req.payload.find({
      collection: 'pages',
      where: { and: [{ kind: { equals: 'standard' } }, { _status: { equals: 'published' } }] },
      limit: 200,
      pagination: false,
      depth: 0,
      locale: 'en',
      req,
      overrideAccess: true,
    }),
  )
  return docs.map((d) => ({
    id: String(d.id),
    title: d.title,
    inHeader: Boolean(d.placement?.inHeader),
    footerGroup: d.placement?.footerGroup || null,
    order: d.placement?.order ?? 100,
  }))
}

/**
 * Everything that needs other documents: address uniqueness per language and kind, the English
 * address and at least one section before publishing, unique anchors, header/footer limits.
 * Runs on every write path, REST included (FR-003, FR-004).
 */
export const preparePage: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const errors: { path: string; message: string }[] = []
  const kind = str(data.kind) || str(originalDoc?.kind) || 'standard'
  const publishing = data._status === 'published'
  const locale = localeOf(req)

  if (operation === 'update' && originalDoc?.publishedAt && data.kind && data.kind !== originalDoc.kind) {
    errors.push({ path: 'kind', message: 'A page that has been published cannot change kind.' })
  }

  const slug = str(data.slug)
  if (slug && locale) {
    const clash = await reading(req, () =>
      req.payload.find({
        collection: 'pages',
        where: {
          and: [
            { slug: { equals: slug } },
            { kind: { equals: kind } },
            ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
          ],
        },
        locale,
        fallbackLocale: false,
        draft: true,
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      }),
    )
    if (clash.docs.length > 0) errors.push({ path: 'slug', message: pageError('pages.slug.duplicate') })
  }

  if (publishing) {
    const english = locale === 'en' ? slug || str(originalDoc?.slug) : await englishSlug(req, originalDoc?.id)
    if (!english) errors.push({ path: 'slug', message: pageError('pages.slug.required') })

    const sections = (data.sections ?? originalDoc?.sections ?? []) as Row[]
    if (sections.length === 0) errors.push({ path: 'sections', message: pageError('pages.sections.required') })
    const anchors = sections.map((s) => str(s.anchor)).filter(Boolean)
    if (anchors.some((a, i) => anchors.indexOf(a) !== i)) errors.push({ path: 'sections', message: pageError('pages.sections.anchor') })
  }

  if (kind === 'intent') {
    // Intent pages are reached by their own address; they never appear in the header or footer.
    data.placement = { ...(data.placement as Row | undefined), inHeader: false, footerGroup: '' }
    if (publishing) errors.push(...(await intentErrors(req, { ...(originalDoc?.intent as Row | undefined), ...(data.intent as Row | undefined) })))
  } else if (publishing) {
    const placement = { ...(originalDoc?.placement as Row | undefined), ...(data.placement as Row | undefined) }
    if (placement.inHeader || placement.footerGroup) {
      const settings = await reading(req, () => req.payload.findGlobal({ slug: 'site-settings', depth: 0, req, overrideAccess: true }))
      const keys = (settings.footerGroups ?? []).map((g) => g.key)
      const error = checkPlacementLimits(
        await otherPlacements(req),
        {
          id: String(originalDoc?.id ?? '__new__'),
          title: str(data.title) || str(originalDoc?.title),
          inHeader: Boolean(placement.inHeader),
          footerGroup: str(placement.footerGroup) || null,
          order: 100,
        },
        keys,
      )
      if (error) errors.push({ path: error === 'pages.nav.headerLimit' ? 'placement.inHeader' : 'placement.footerGroup', message: pageError(error) })
    }
  }

  if (errors.length > 0) fail(req, errors)
  return data
}

/** The rules of an intent page that need other documents (spec US4-S2): the editor is told at save time. */
async function intentErrors(req: PayloadRequest, intent: Row): Promise<{ path: string; message: string }[]> {
  const errors: { path: string; message: string }[] = []
  const persona = relationId(intent.persona)
  const key = { personaId: persona, specialtyId: relationId(intent.specialty), locationId: relationId(intent.location) }
  if (!intentHasTarget(key)) errors.push({ path: 'intent.persona', message: pageError('pages.intent.target') })

  if (persona) {
    const audience = await reading(req, () => audiencePersonaIds(req))
    if (!audience.includes(persona)) errors.push({ path: 'intent.persona', message: pageError('pages.intent.personaInactive') })
  }

  const presets = ((intent.presets ?? []) as Row[]).filter((p) => p.token)
  if (presets.length > 0) {
    const landing = await reading(req, () => req.payload.findGlobal({ slug: 'landing-page', depth: 0, req, overrideAccess: true }))
    const tokens = (landing.briefBuilder?.slots ?? []).map((s) => s.token)
    const unknown = presets.map((p) => str(p.token)).filter((t) => !tokens.includes(t))
    if (unknown.length > 0) errors.push({ path: 'intent.presets', message: `${pageError('pages.intent.unknownStep')} (${unknown.join(', ')}; steps are: ${tokens.join(', ')})` })
  }

  const faq = (intent.faq ?? []) as Row[]
  if (faq.some((item) => !str(item.question).trim() || !lexicalToText(item.answer).trim())) errors.push({ path: 'intent.faq', message: pageError('pages.intent.faq') })
  return errors
}

const relationId = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' ? relationId((value as { id?: unknown }).id) : String(value)
}

async function englishSlug(req: PayloadRequest, id: unknown): Promise<string> {
  if (id === undefined || id === null) return ''
  try {
    const doc = await reading(req, () =>
      req.payload.findByID({ collection: 'pages', id: id as number, locale: 'en', fallbackLocale: false, draft: true, depth: 0, req, overrideAccess: true }),
    )
    return str(doc.slug)
  } catch {
    return ''
  }
}

/** Stamps who published and when, and remembers the address a published page is leaving (FR-003). */
export const stampAndTrackSlugs: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (data._status !== 'published') return data
  const next: Row = { ...data, publishedAt: new Date().toISOString(), publishedBy: req.user?.id ?? null }
  const locale = localeOf(req)
  const slug = str(data.slug)
  if (locale && slug && originalDoc?.id) {
    let live = ''
    try {
      const published = await reading(req, () =>
        req.payload.findByID({ collection: 'pages', id: originalDoc.id, locale, fallbackLocale: false, draft: false, depth: 0, req, overrideAccess: true }),
      )
      live = published._status === 'published' ? str(published.slug) : ''
    } catch {
      live = ''
    }
    if (live && live !== slug) {
      const previous = ((data.previousSlugs ?? originalDoc.previousSlugs ?? []) as Row[]).filter((p) => !(p.locale === locale && p.slug === slug))
      next.previousSlugs = [...previous, { locale, slug: live }].slice(-20)
    }
  }
  return next
}

/** A published page frees its address from any "removed" mark and refreshes the cached pages. */
export const afterPageChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  const locale = localeOf(req)
  if (doc._status === 'published' && locale && doc.slug) {
    await clearRemovedPath(req.payload, locale, sitePath(doc.kind, doc.slug))
  }
  if (!req.context?.disableRevalidate) safeRevalidate('pages')
  return doc
}

/** A deleted page that was ever public leaves a "removed" mark per language (spec US1-S6). */
export const beforePageDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  let doc: Row
  try {
    doc = (await reading(req, () =>
      req.payload.findByID({ collection: 'pages', id, locale: 'all', fallbackLocale: false, draft: false, depth: 0, req, overrideAccess: true }),
    )) as unknown as Row
  } catch (error) {
    throw new APIError(`Could not read the page before deleting it: ${(error as Error).message}`, 500, undefined, true)
  }
  if (doc._status !== 'published') return
  const slugs = (doc.slug ?? {}) as Partial<Record<Locale, string>>
  req.context.removedPage = { kind: doc.kind, en: slugs.en ?? '', ar: slugs.ar || slugs.en || '' }
}

export const afterPageDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const removed = req.context?.removedPage as { kind: unknown; en: string; ar: string } | undefined
  if (removed) {
    await recordRemovedPath(req.payload, {
      kind: 'page',
      paths: { en: removed.en ? sitePath(removed.kind, removed.en) : undefined, ar: removed.ar ? sitePath(removed.kind, removed.ar) : undefined },
    })
  }
  if (!req.context?.disableRevalidate) safeRevalidate('pages')
  return doc
}
