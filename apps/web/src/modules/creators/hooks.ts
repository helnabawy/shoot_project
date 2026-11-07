import { generateCreatorCode, MAX_SAMPLES } from '@shoot/domain/creators'
import { resolveActivePersonas } from '@shoot/domain/personas'
import {
  APIError,
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'
import { isEditorUser } from '@/shared/payload/access'
import { safeRevalidate } from '@/shared/payload/hooks/revalidate'
import { relId } from './references'

const reject = (message: string) => new APIError(message, 400, undefined, true)

const ids = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]).map(relId).filter((v): v is string => v !== null)

/** Personas in the site's audience: listed in Site settings and active (the one meaning used everywhere). */
export async function audiencePersonaIds(req: PayloadRequest): Promise<string[]> {
  const [settings, personas] = await Promise.all([
    req.payload.findGlobal({ slug: 'site-settings', depth: 0, req, overrideAccess: true }),
    req.payload.find({ collection: 'personas', limit: 200, depth: 0, pagination: false, req, overrideAccess: true }),
  ])
  const refs = (settings.activePersonas ?? []).map((p) => (typeof p === 'object' ? p.id : p))
  const resolved = resolveActivePersonas(
    refs,
    personas.docs.map((p) => ({ id: String(p.id), slug: p.slug, singular: p.singular, plural: p.plural, order: p.order ?? 100, active: p.active ?? true })),
  )
  return resolved.map((p) => p.id)
}

async function uniqueCode(req: PayloadRequest): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCreatorCode()
    const clash = await req.payload.count({ collection: 'creator-profiles', where: { code: { equals: code } }, req, overrideAccess: true })
    if (!clash.totalDocs) return code
  }
  throw reject('creators.code.unavailable')
}

/**
 * Sets `user` and `code` once and refuses later changes; checks the relationships that need other
 * documents (research §4, data-model). Runs on every write path, REST included.
 */
export const prepareProfile: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const next: Record<string, unknown> = { ...data }
  const editor = isEditorUser(req.user)

  if (operation === 'create') {
    if (req.user && !editor) next.user = req.user.id
    // Demo seeds pin codes; the flag lives in the request context, which REST callers cannot set.
    const pinned = req.context?.seedFixedCode === true && typeof next.code === 'string' ? next.code : null
    next.code = pinned ?? (await uniqueCode(req))
  } else {
    if (next.code !== undefined && next.code !== originalDoc?.code) throw reject('creators.code.immutable')
    if (next.user !== undefined && relId(next.user) !== relId(originalDoc?.user)) throw reject('creators.user.immutable')
  }

  const merged = { ...(originalDoc ?? {}), ...next } as Record<string, unknown>
  const errors: { path: string; message: string }[] = []

  // Personas: providers may only newly choose personas that are in the audience (CP-FR-009).
  if (next.personas !== undefined && !editor) {
    const before = new Set(ids(originalDoc?.personas))
    const added = ids(next.personas).filter((id) => !before.has(id))
    if (added.length) {
      const audience = new Set(await audiencePersonaIds(req))
      if (added.some((id) => !audience.has(id))) errors.push({ path: 'personas', message: 'creators.persona.inactive' })
    }
  }

  // CP-FR-012: a profile names emirates only; a city (from an older client or the REST API) becomes its emirate.
  if (next.cities !== undefined) {
    const chosen = ids(next.cities)
    if (chosen.length) {
      const found = await req.payload.find({ collection: 'locations', where: { id: { in: chosen } }, depth: 0, pagination: false, req, overrideAccess: true })
      const emirateOf = new Map(found.docs.map((l) => [String(l.id), relId(l.parent) ?? String(l.id)]))
      next.cities = [...new Set(chosen.map((id) => emirateOf.get(id) ?? id))].map(Number)
    }
  }

  // Specialties must belong to one of the chosen personas; sample categories must be among the specialties.
  const specialtyIds = ids(merged.specialties)
  if ((next.specialties !== undefined || next.personas !== undefined) && specialtyIds.length) {
    const personaIds = new Set(ids(merged.personas))
    const categories = await req.payload.find({
      collection: 'categories',
      where: { id: { in: specialtyIds } },
      limit: specialtyIds.length,
      depth: 0,
      pagination: false,
      req,
      overrideAccess: true,
    })
    const ok = categories.docs.every((c) => ids(c.personas).some((p) => personaIds.has(p)))
    if (!ok) errors.push({ path: 'specialties', message: 'creators.specialty.notInPersona' })
  }
  if (next.samples !== undefined || next.specialties !== undefined) {
    const rows = (Array.isArray(merged.samples) ? merged.samples : []) as { category?: unknown }[]
    if (rows.length > MAX_SAMPLES) errors.push({ path: 'samples', message: 'creators.samples.limit' })
    const allowed = new Set(specialtyIds)
    if (rows.some((row) => relId(row.category) && !allowed.has(relId(row.category) as string))) {
      errors.push({ path: 'samples', message: 'creators.samples.category' })
    }
  }

  // A provider may attach only images they uploaded themselves (admins may attach any). Images already on the
  // profile stay, so an admin-added sample never blocks the provider's later saves.
  if (!editor && req.user && (next.photo !== undefined || next.samples !== undefined)) {
    const rows = (Array.isArray(next.samples) ? next.samples : []) as { image?: unknown }[]
    const wanted = new Set([relId(next.photo), ...rows.map((row) => relId(row.image))].filter((v): v is string => v !== null))
    const original = originalDoc as { photo?: unknown; samples?: { image?: unknown }[] } | undefined
    const already = new Set([relId(original?.photo), ...(original?.samples ?? []).map((row) => relId(row.image))].filter((v): v is string => v !== null))
    const added = [...wanted].filter((id) => !already.has(id))
    if (added.length) {
      const own = await req.payload.count({
        collection: 'media',
        where: { and: [{ id: { in: added } }, { uploadedBy: { equals: req.user.id } }] },
        req,
        overrideAccess: true,
      })
      if (own.totalDocs !== added.length) errors.push({ path: next.samples !== undefined ? 'samples' : 'photo', message: 'creators.media.notYours' })
    }
  }

  if (errors.length) throw new ValidationError({ collection: 'creator-profiles', errors, req })
  return next
}

/** A verified creator's edits may go live at once only when the owner of the site switched that on. */
async function mayAutoPublish(req: PayloadRequest, profileId: unknown): Promise<boolean> {
  if (!profileId) return false
  const settings = await req.payload.findGlobal({ slug: 'site-settings', depth: 0, req, overrideAccess: true })
  if (!settings.autoPublishEdits) return false
  const listing = await req.payload.find({
    collection: 'creator-listings',
    where: { profile: { equals: profileId } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  return Boolean(listing.docs[0]?.verifiedAt)
}

/**
 * Providers can never publish themselves (research §4). This runs before the operation because Payload
 * decides "draft save or live write" from the request, not from the data a hook later changes: coercing
 * `_status` afterwards would unpublish a live profile and write the pending edits into its live row. So a
 * provider's write is refused unless it is a draft save, or the owner of the site allows verified creators'
 * edits to go live. The same check covers REST, where `?draft=true` is the provider's to omit.
 */
export const guardProviderPublish: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if ((operation !== 'create' && operation !== 'update') || !req.user || isEditorUser(req.user)) return args
  const a = args as { draft?: boolean; data?: { _status?: string }; id?: string | number }
  const wantsLive = !a.draft || a.data?._status === 'published'
  if (wantsLive && !(await mayAutoPublish(req, a.id))) throw new APIError('creators.errors.mustBeDraft', 403, undefined, true)
  return args
}

const CONTEXT_FLAG = 'creatorsHook'

/** Creates the profile's listing; on publish stamps `verifiedAt` once and clears `submittedAt`. */
export const syncListing: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (req.context?.[CONTEXT_FLAG]) return doc
  const context = { ...req.context, [CONTEXT_FLAG]: true }

  if (operation === 'create') {
    await req.payload.create({
      collection: 'creator-listings',
      data: { profile: doc.id, user: typeof doc.user === 'object' ? doc.user.id : doc.user, active: true },
      req,
      context,
      overrideAccess: true,
    })
  }

  const published = doc._status === 'published'
  if (published) {
    const found = await req.payload.find({
      collection: 'creator-listings',
      where: { profile: { equals: doc.id } },
      limit: 1,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const listing = found.docs[0]
    if (listing) {
      await req.payload.update({
        collection: 'creator-listings',
        id: listing.id,
        data: { verifiedAt: listing.verifiedAt ?? new Date().toISOString(), submittedAt: null },
        req,
        context,
        overrideAccess: true,
      })
    }
  }

  // Draft saves leave the public site unchanged; publishing and unpublishing do not (research §2).
  if (published || previousDoc?._status === 'published') {
    if (!req.context?.disableRevalidate) safeRevalidate('creators')
  }
  return doc
}

/**
 * Removes the profile's listing before the profile row goes: the listing's foreign key is
 * `ON DELETE SET NULL` on a required column, so deleting the profile first would fail. It runs in the
 * same transaction, so a refused delete (the briefs guard) rolls this back.
 */
export const removeListing: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'creator-listings',
    where: { profile: { equals: id } },
    req,
    context: { ...req.context, [CONTEXT_FLAG]: true },
    overrideAccess: true,
  })
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (!req.context?.disableRevalidate) safeRevalidate('creators')
  return doc
}
