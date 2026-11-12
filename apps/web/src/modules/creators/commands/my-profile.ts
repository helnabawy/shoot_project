import 'server-only'
import type { MyProfileV1, ProblemField, ProfilePatchV1, UploadV1 } from '@shoot/domain/api/v1'
import {
  ACCEPTED_UPLOAD_TYPES,
  canAddSample,
  IDENTITY_DOCUMENTS,
  IDENTITY_UPLOAD_TYPES,
  isIdentityDocumentKind,
  MAX_IDENTITY_BYTES,
  MAX_SAMPLES,
  MAX_UPLOAD_BYTES,
  missingForReview,
  identityProvided,
  identityStanding,
  parseProfileForm,
  parseSampleForm,
  removeItem,
  type IdentityDocumentKind,
  PROFILE_STEPS,
} from '@shoot/domain/creators'
import type { Payload } from 'payload'
import type { Media, User } from '@/payload-types'
import { problem, type Problem } from '@/shared/api/problem'
import type { ActorContext } from '@/shared/api/actor'
import { toWireImage, mediaBase } from '@/shared/api/wire'
import { errorStatus, isPayloadError } from '@/shared/payload/errors'
import { getMyProfileView } from '../my-profile'
import { relId } from '../references'

/**
 * The creator's own profile for the app (feature 014): the same Payload calls and rules as the website's
 * editor (`modules/creators/actions.ts`), answering the one `MyProfileV1` view after every change.
 * Commands take the actor context; they read no cookies and no clock.
 */

const notProvider = () => problem(403, 'creators.errors.notProvider')
const providerOf = (ctx: ActorContext): User | null => (ctx.user?.accountType === 'provider' ? ctx.user : null)

const fieldCode = (path: string, code: string): ProblemField => ({ path: `body.${path}`, code }) as ProblemField

/** The form field names the shared schema reports, as the wire's field names. */
const wirePath = (field: string) => field.replace(/_(en|ar)$/, '').replace(/^cities/, 'emirates').replace(/^personas/, 'professions')

type Row = { id?: string; kind: 'image' | 'video'; image: number | null; videoUrl: string; category: number | null; caption: { en: string; ar: string } }

async function ownProfile(payload: Payload, user: User) {
  return (await payload.find({ collection: 'creator-profiles', where: { user: { equals: user.id } }, draft: true, limit: 1, depth: 0, overrideAccess: true })).docs[0] ?? null
}

async function listingOf(payload: Payload, profileId: number) {
  return (await payload.find({ collection: 'creator-listings', where: { profile: { equals: profileId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
}

async function publishesAtOnce(payload: Payload, profileId: number | null): Promise<boolean> {
  if (profileId === null) return false
  const [settings, listing] = await Promise.all([payload.findGlobal({ slug: 'site-settings', depth: 0 }), listingOf(payload, profileId)])
  return Boolean(settings.autoPublishEdits && listing?.verifiedAt)
}

/** The whole view: profile, steps, identity, samples, options and limits. */
export async function readMyProfile(ctx: ActorContext): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  return buildView(ctx, user)
}

async function buildView(ctx: ActorContext, user: User): Promise<MyProfileV1> {
  const { profile, identity, options, defaults, strength, missing } = await getMyProfileView(user, ctx.locale)
  const base = mediaBase()
  const ids = [profile?.photo?.id, ...(profile?.samples.map((s) => s.image?.id) ?? [])].filter((v): v is number => typeof v === 'number')
  const media = ids.length
    ? (await ctx.payload.find({ collection: 'media', where: { id: { in: ids } }, depth: 0, pagination: false, locale: ctx.locale, fallbackLocale: 'en', overrideAccess: true })).docs
    : []
  const byId = new Map<number, Media>(media.map((m) => [m.id, m]))
  const image = (id: number | undefined) => (id === undefined ? null : toWireImage(byId.get(id), base))

  const fields = {
    displayName: profile?.displayName ?? { en: defaults.name, ar: '' },
    bio: profile?.bio ?? { en: '', ar: '' },
    gender: profile?.gender ?? null,
    nationality: profile?.nationality ?? null,
    yearsExperience: profile?.yearsExperience ?? null,
    professions: (profile?.personas ?? defaults.personas).map(String),
    specialties: (profile?.specialties ?? defaults.specialties).map(String),
    emirates: (profile?.cities ?? []).map(String),
    languages: profile?.languages ?? [],
    social: (profile?.social ?? []).map((s) => ({ platform: s.platform as MyProfileV1['fields']['social'][number]['platform'], url: s.url })),
  }
  return {
    code: profile?.code ?? '',
    status: profile?.status ?? 'draft',
    submittedAt: profile?.submittedAt ?? null,
    reviewNote: profile?.reviewNote ?? '',
    strength: strength.percent,
    canSubmit: missing.length === 0,
    hasPendingChanges: profile?.hasNewerDraft ?? false,
    fields,
    photo: image(profile?.photo?.id),
    samples: (profile?.samples ?? []).map((s) => ({
      id: s.id,
      kind: s.kind,
      image: image(s.image?.id),
      videoUrl: s.videoUrl,
      caption: s.caption,
      specialty: s.category === null ? null : String(s.category),
    })),
    identity: Object.fromEntries(IDENTITY_DOCUMENTS.map((kind) => [kind, { state: identity[kind].state, uploadedAt: identity[kind].uploadedAt, note: identity[kind].note }])) as MyProfileV1['identity'],
    steps: PROFILE_STEPS.map((key, i) => {
      const { required, recommended } = strength.steps[key]
      return { key, number: i + 1, state: required.length ? ('needs' as const) : recommended.length ? ('recommended' as const) : ('done' as const), required: [...required], recommended: [...recommended] }
    }),
    options: {
      professions: options.personas.map((p) => ({ id: String(p.id), name: p.name })),
      specialties: options.specialties.map((s) => ({ id: String(s.id), name: s.name, professionIds: s.personaIds.map(String) })),
      emirates: options.emirates.map((e) => ({ id: String(e.id), name: e.name })),
      languages: options.languages,
      countries: options.countries,
    },
    limits: { samples: MAX_SAMPLES, identityBytes: MAX_IDENTITY_BYTES },
  }
}

/** Payload's own field errors and the `creators.` / `media.` rule messages as a problem. */
function payloadProblem(error: unknown): Problem | null {
  if (isPayloadError(error, 'ValidationError')) {
    const found = (error as { data?: { errors?: { path?: string; message?: string }[] } }).data?.errors ?? []
    const fields = found.filter((e) => e.path).map((e) => fieldCode(wirePath(e.path as string), 'creators.errors.generic'))
    return problem(422, 'api.errors.invalidInput', { fields })
  }
  const message = error instanceof Error ? error.message : ''
  if ([400, 403, 429].includes(errorStatus(error) ?? 0) && /^(creators|media)\./.test(message)) {
    return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body', code: message as ProblemField['code'] }] })
  }
  return null
}

/** Decodes an upload and applies the type and size rules; a problem names the field and the rule. */
function decode(upload: UploadV1, types: readonly string[], maxBytes: number, path: string, codes: { type: ProblemField['code']; size: ProblemField['code'] }): { data: Buffer } | Problem {
  if (!types.includes(upload.contentType)) return problem(422, 'api.errors.invalidInput', { fields: [{ path, code: codes.type }] })
  const data = Buffer.from(upload.data, 'base64')
  if (data.byteLength === 0) return problem(422, 'api.errors.invalidInput', { fields: [{ path, code: 'creators.identity.file' }] })
  if (data.byteLength > maxBytes) return problem(422, 'api.errors.invalidInput', { fields: [{ path, code: codes.size }] })
  return { data }
}

async function uploadMedia(payload: Payload, user: User, file: { data: Buffer; upload: UploadV1 }, alt: { en: string; ar: string }): Promise<number> {
  const media = await payload.create({
    collection: 'media',
    data: { alt: alt.en },
    file: { data: file.data, mimetype: file.upload.contentType, name: file.upload.filename || 'upload', size: file.data.byteLength },
    locale: 'en',
    user,
    overrideAccess: false,
    depth: 0,
  })
  if (alt.ar) await payload.update({ collection: 'media', id: media.id, data: { alt: alt.ar }, locale: 'ar', user, overrideAccess: false, depth: 0 })
  return media.id
}

async function readRows(payload: Payload, profileId: number): Promise<Row[]> {
  const doc = await payload.findByID({ collection: 'creator-profiles', id: profileId, draft: true, locale: 'all', depth: 0, overrideAccess: true })
  const rows = (doc.samples ?? []) as unknown as { id?: string; kind?: 'image' | 'video'; image?: unknown; videoUrl?: string | null; category?: unknown; caption?: { en?: string | null; ar?: string | null } | string | null }[]
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind === 'video' ? 'video' : 'image',
    image: r.image ? Number(relId(r.image)) : null,
    videoUrl: r.videoUrl ?? '',
    category: r.category ? Number(relId(r.category)) : null,
    caption: typeof r.caption === 'object' && r.caption !== null ? { en: r.caption.en ?? '', ar: r.caption.ar ?? '' } : { en: r.caption ?? '', ar: '' },
  }))
}

async function writeRows(payload: Payload, user: User, profileId: number, rows: Row[], publish: boolean) {
  const status = publish ? ({ _status: 'published' } as const) : {}
  const common = { collection: 'creator-profiles', id: profileId, draft: !publish, user, overrideAccess: false, depth: 0 } as const
  const shared = (r: Row) => ({ kind: r.kind, image: r.image, videoUrl: r.videoUrl || null, category: r.category })
  const en = await payload.update({ ...common, locale: 'en', data: { ...status, samples: rows.map((r) => ({ ...(r.id ? { id: r.id } : {}), ...shared(r), caption: r.caption.en })) } as never })
  const ids = ((en.samples ?? []) as { id?: string }[]).map((s) => s.id)
  await payload.update({ ...common, locale: 'ar', data: { ...status, samples: rows.map((r, i) => ({ id: ids[i], ...shared(r), caption: r.caption.ar || null })) } as never })
}

/** Saves any subset of the profile's fields (both languages), creating the profile on the first save. */
export async function saveMyProfile(ctx: ActorContext, patch: ProfilePatchV1): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const failure = await persist(ctx, user, patch)
  return failure ?? buildView(ctx, user)
}

/** The shared write: merges the patch over what is saved (or the registration defaults), validates, stores. */
async function persist(ctx: ActorContext, user: User, patch: ProfilePatchV1, extra: { photo?: number } = {}): Promise<Problem | null> {
  const { payload } = ctx
  const current = await getMyProfileView(user, ctx.locale)
  const base = current.profile
  const merged = {
    displayName: patch.displayName ?? base?.displayName ?? { en: current.defaults.name, ar: '' },
    bio: patch.bio ?? base?.bio ?? { en: '', ar: '' },
    personas: patch.professions ?? (base?.personas ?? current.defaults.personas).map(String),
    specialties: patch.specialties ?? (base?.specialties ?? current.defaults.specialties).map(String),
    cities: patch.emirates ?? (base?.cities ?? []).map(String),
    languages: patch.languages ?? base?.languages ?? [],
    gender: patch.gender ?? base?.gender ?? '',
    nationality: patch.nationality === undefined ? (base?.nationality ?? '') : (patch.nationality ?? ''),
    yearsExperience: patch.yearsExperience === undefined ? (base?.yearsExperience == null ? '' : String(base.yearsExperience)) : patch.yearsExperience === null ? '' : String(patch.yearsExperience),
    social: patch.social ?? base?.social ?? [],
  }
  const parsed = parseProfileForm({
    displayName_en: merged.displayName.en,
    displayName_ar: merged.displayName.ar,
    bio_en: merged.bio.en,
    bio_ar: merged.bio.ar,
    personas: merged.personas,
    specialties: merged.specialties,
    cities: merged.cities,
    languages: merged.languages,
    gender: merged.gender,
    nationality: merged.nationality,
    yearsExperience: merged.yearsExperience,
    social: merged.social,
  })
  if (!parsed.ok) {
    const seen = new Set<string>()
    const fields: ProblemField[] = []
    for (const [field, messages] of Object.entries(parsed.errors)) {
      const path = wirePath(field).split('.')[0] as string
      if (seen.has(path)) continue
      seen.add(path)
      fields.push(fieldCode(path, 'creators.errors.generic'))
      void messages
    }
    return problem(422, 'api.errors.invalidInput', { fields })
  }
  const input = parsed.data
  const existing = await ownProfile(payload, user)
  const publish = await publishesAtOnce(payload, existing?.id ?? null)
  const shared = {
    personas: input.personas.map(Number),
    specialties: input.specialties.map(Number),
    cities: input.cities.map(Number),
    languages: input.languages,
    gender: input.gender,
    nationality: input.nationality,
    yearsExperience: input.yearsExperience,
    social: input.social,
    ...(extra.photo !== undefined ? { photo: extra.photo } : {}),
  }
  const status = publish ? ({ _status: 'published' } as const) : {}
  const common = { collection: 'creator-profiles', draft: !publish, user, overrideAccess: false, depth: 0 } as const
  try {
    const id =
      existing?.id ??
      (await payload.create({ ...common, draft: true, locale: 'en', data: { ...shared, displayName: input.displayName.en, bio: input.bio.en, user: user.id, _status: 'draft' } as never })).id
    if (existing) await payload.update({ ...common, id, locale: 'en', data: { ...shared, ...status, displayName: input.displayName.en, bio: input.bio.en } as never })
    await payload.update({
      ...common,
      id,
      locale: 'ar',
      data: { ...status, ...(input.displayName.ar || !publish ? { displayName: input.displayName.ar || null } : {}), bio: input.bio.ar || null } as never,
    })
    return null
  } catch (error) {
    const mapped = payloadProblem(error)
    if (mapped) return mapped
    throw error
  }
}

/** The profile row, saving the registration defaults first when the creator has none yet. */
async function ensureProfile(ctx: ActorContext, user: User): Promise<{ id: number } | Problem> {
  const existing = await ownProfile(ctx.payload, user)
  if (existing) return existing
  const failure = await persist(ctx, user, {})
  if (failure) return failure
  const created = await ownProfile(ctx.payload, user)
  return created ?? problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body', code: 'creators.errors.noProfile' }] })
}

export async function uploadPhoto(ctx: ActorContext, upload: UploadV1): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const file = decode(upload, ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, 'body.data', { type: 'media.upload.type', size: 'media.upload.size' })
  if ('status' in file) return file
  const profile = await ensureProfile(ctx, user)
  if ('status' in profile) return profile
  try {
    const name = ((await getMyProfileView(user, ctx.locale)).profile?.displayName.en ?? '').trim()
    const mediaId = await uploadMedia(ctx.payload, user, { data: file.data, upload }, { en: name, ar: '' })
    const failure = await persist(ctx, user, {}, { photo: mediaId })
    if (failure) return failure
  } catch (error) {
    const mapped = payloadProblem(error)
    if (mapped) return mapped
    throw error
  }
  return buildView(ctx, user)
}

export async function uploadIdentity(ctx: ActorContext, kind: IdentityDocumentKind, upload: UploadV1): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  if (!isIdentityDocumentKind(kind)) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'params.kind', code: 'creators.identity.kind' }] })
  const file = decode(upload, IDENTITY_UPLOAD_TYPES, MAX_IDENTITY_BYTES, 'body.data', { type: 'creators.identity.type', size: 'creators.identity.size' })
  if ('status' in file) return file
  const { payload } = ctx
  const before = await payload.find({ collection: 'identity-documents', where: { and: [{ user: { equals: user.id } }, { kind: { equals: kind } }] }, depth: 0, pagination: false, select: { kind: true }, overrideAccess: true })
  try {
    await payload.create({
      collection: 'identity-documents',
      data: { kind, user: user.id, status: 'pending' },
      file: { data: file.data, mimetype: upload.contentType, name: upload.filename || kind, size: file.data.byteLength },
      user,
      overrideAccess: false,
      depth: 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/^creators\.identity\./.test(message)) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body.data', code: message as ProblemField['code'] }] })
    // A file that is not what its type says (a broken PDF or image) is refused like a wrong type.
    if (isPayloadError(error, 'ValidationError')) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body.data', code: 'creators.identity.type' }] })
    throw error
  }
  // The replaced files are the owner's own; the server removes them (providers cannot delete).
  if (before.docs.length) await payload.delete({ collection: 'identity-documents', where: { id: { in: before.docs.map((d) => d.id) } }, overrideAccess: true })
  return buildView(ctx, user)
}

export interface SampleAddInput {
  kind: 'image' | 'video'
  videoUrl?: string
  caption?: { en: string; ar: string }
  specialty?: string | null
  file: UploadV1
}

export async function addSample(ctx: ActorContext, input: SampleAddInput): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const parsed = parseSampleForm({ kind: input.kind, videoUrl: input.videoUrl ?? '', caption_en: input.caption?.en ?? '', caption_ar: input.caption?.ar ?? '', category: input.specialty ?? '' })
  if (!parsed.ok) {
    return problem(422, 'api.errors.invalidInput', { fields: Object.keys(parsed.errors).map((f) => fieldCode(f, 'creators.errors.generic')) })
  }
  const field = input.kind === 'video' ? 'poster' : 'image'
  const file = decode(input.file, ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, 'body.file', { type: 'media.upload.type', size: 'media.upload.size' })
  if ('status' in file) return file
  const profile = await ensureProfile(ctx, user)
  if ('status' in profile) return profile
  const { payload } = ctx
  const rows = await readRows(payload, profile.id)
  if (!canAddSample(rows.length)) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body', code: 'creators.samples.limit' }] })
  const sample = parsed.data
  const category = sample.category ? Number(sample.category) : null
  const doc = await ownProfile(payload, user)
  if (category !== null && !((doc?.specialties ?? []) as unknown[]).map((s) => Number(relId(s))).includes(category)) {
    return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body.specialty', code: 'creators.samples.category' }] })
  }
  void field
  try {
    const name = ((doc?.displayName as unknown as string | undefined) ?? '').trim()
    const mediaId = await uploadMedia(payload, user, { data: file.data, upload: input.file }, { en: sample.caption.en || (name ? `Portfolio sample by ${name}` : 'Portfolio sample'), ar: sample.caption.ar })
    await writeRows(payload, user, profile.id, [...rows, { kind: sample.kind, image: mediaId, videoUrl: sample.videoUrl ?? '', category, caption: sample.caption }], await publishesAtOnce(payload, profile.id))
  } catch (error) {
    const mapped = payloadProblem(error)
    if (mapped) return mapped
    throw error
  }
  return buildView(ctx, user)
}

export async function removeSample(ctx: ActorContext, index: number): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const profile = await ownProfile(ctx.payload, user)
  if (!profile) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body', code: 'creators.errors.noProfile' }] })
  const rows = await readRows(ctx.payload, profile.id)
  try {
    await writeRows(ctx.payload, user, profile.id, removeItem(rows, index), await publishesAtOnce(ctx.payload, profile.id))
  } catch (error) {
    const mapped = payloadProblem(error)
    if (mapped) return mapped
    throw error
  }
  return buildView(ctx, user)
}

/** Sends the profile for review once nothing required is missing: the review date is written by the system. */
export async function submitForReview(ctx: ActorContext): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const { payload } = ctx
  const profile = await ensureProfile(ctx, user)
  if ('status' in profile) return profile
  const doc = await payload.findByID({ collection: 'creator-profiles', id: profile.id, draft: true, locale: 'en', fallbackLocale: false, depth: 0, overrideAccess: true })
  const documents = await payload.find({ collection: 'identity-documents', where: { user: { equals: user.id } }, depth: 0, pagination: false, select: { kind: true, status: true, createdAt: true }, overrideAccess: true })
  const missing = missingForReview({
    displayName: doc.displayName ?? '',
    personas: doc.personas ?? [],
    specialties: doc.specialties ?? [],
    cities: doc.cities ?? [],
    languages: doc.languages ?? [],
    gender: doc.gender ?? null,
    documents: identityProvided(identityStanding(documents.docs.map((d) => ({ kind: d.kind, status: d.status, createdAt: d.createdAt })))),
  })
  if (missing.length) {
    return problem(422, 'creators.submit.incomplete', { fields: missing.map((f) => fieldCode(f, 'creators.errors.required')) })
  }
  const listing = await listingOf(payload, profile.id)
  if (listing) await payload.update({ collection: 'creator-listings', id: listing.id, data: { submittedAt: ctx.now().toISOString() }, overrideAccess: true })
  return buildView(ctx, user)
}

/** Hides or shows the profile everywhere at once; never publishes pending edits. */
export async function setVisibility(ctx: ActorContext, hidden: boolean): Promise<MyProfileV1 | Problem> {
  const user = providerOf(ctx)
  if (!user) return notProvider()
  const profile = await ownProfile(ctx.payload, user)
  const listing = profile ? await listingOf(ctx.payload, profile.id) : undefined
  if (!listing) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body', code: 'creators.errors.noProfile' }] })
  await ctx.payload.update({ collection: 'creator-listings', id: listing.id, data: { active: !hidden }, user, overrideAccess: false })
  return buildView(ctx, user)
}
