'use server'

import {
  ACCEPTED_UPLOAD_TYPES,
  canAddSample,
  identityProvided,
  identityStanding,
  isIdentityDocumentKind,
  isIdentityUploadType,
  MAX_IDENTITY_BYTES,
  MAX_UPLOAD_BYTES,
  missingForReview,
  moveItem,
  parseProfileForm,
  parseSampleForm,
  PROFILE_LIMITS,
  removeItem,
} from '@shoot/domain/creators'
import { revalidatePath } from 'next/cache'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { getCurrentUser } from '@/modules/auth/session'
import { getPayloadClient } from '@/shared/lib/payload'
import { errorStatus, isPayloadError } from '@/shared/payload/errors'
import { relId } from './references'

/** What a provider action returns; `errors` holds the first message per field (a translation key). */
export type ProfileState =
  | { status: 'idle' }
  | { status: 'error'; errors: Record<string, string>; formError?: string }
  | { status: 'saved'; published: boolean; submitted?: boolean }

const fail = (formError: string, errors: Record<string, string> = {}): ProfileState => ({ status: 'error', errors, formError })

async function provider(): Promise<User | null> {
  const user = await getCurrentUser()
  return user?.accountType === 'provider' ? user : null
}
const notProvider = () => fail('creators.errors.notProvider')

const text = (form: FormData, key: string) => String(form.get(key) ?? '')
const refresh = () => {
  revalidatePath('/account/profile')
  revalidatePath('/ar/account/profile')
}

/** Payload's own field errors (relation rules, ownership) as the form's field errors. */
function fromPayloadError(error: unknown): ProfileState | null {
  if (isPayloadError(error, 'ValidationError')) {
    const found = (error as { data?: { errors?: { path?: string; message?: string }[] } }).data?.errors ?? []
    const errors: Record<string, string> = {}
    for (const e of found) if (e.path && e.message) errors[e.path] ??= e.message
    return { status: 'error', errors, formError: 'creators.errors.generic' }
  }
  const message = error instanceof Error ? error.message : ''
  if ([400, 403, 429].includes(errorStatus(error) ?? 0) && /^(creators|media)\./.test(message)) return fail(message)
  return null
}

function readProfileForm(form: FormData) {
  const social: { platform: string; url: string }[] = []
  for (let i = 0; i < PROFILE_LIMITS.social + 2; i += 1) {
    const url = text(form, `social.${i}.url`).trim()
    if (url) social.push({ platform: text(form, `social.${i}.platform`), url })
  }
  return {
    displayName_en: text(form, 'displayName_en'),
    displayName_ar: text(form, 'displayName_ar'),
    bio_en: text(form, 'bio_en'),
    bio_ar: text(form, 'bio_ar'),
    personas: form.getAll('personas').map(String),
    specialties: form.getAll('specialties').map(String),
    cities: form.getAll('cities').map(String),
    languages: form.getAll('languages').map(String),
    gender: text(form, 'gender'),
    nationality: text(form, 'nationality'),
    yearsExperience: text(form, 'yearsExperience'),
    social,
  }
}

const hasFile = (value: FormDataEntryValue | null): value is File => value instanceof File && value.size > 0

async function myProfile(payload: Payload, user: User) {
  return (await payload.find({ collection: 'creator-profiles', where: { user: { equals: user.id } }, draft: true, limit: 1, depth: 0, overrideAccess: true })).docs[0] ?? null
}

/** A verified creator's edits go live at once only when the owner of the site allows it (US3-S3). */
async function publishesAtOnce(payload: Payload, profileId: number | null): Promise<boolean> {
  if (profileId === null) return false
  const [settings, listing] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', depth: 0 }),
    payload.find({ collection: 'creator-listings', where: { profile: { equals: profileId } }, limit: 1, depth: 0, overrideAccess: true }),
  ])
  return Boolean(settings.autoPublishEdits && listing.docs[0]?.verifiedAt)
}

/** Uploads one image to the media library as the provider; the media hooks enforce type, size, quota and rate. */
async function upload(payload: Payload, user: User, image: File, alt: { en: string; ar: string }): Promise<number> {
  const data = Buffer.from(await image.arrayBuffer())
  const media = await payload.create({
    collection: 'media',
    data: { alt: alt.en },
    file: { data, mimetype: image.type, name: image.name || 'upload', size: image.size },
    locale: 'en',
    user,
    overrideAccess: false,
    depth: 0,
  })
  if (alt.ar) await payload.update({ collection: 'media', id: media.id, data: { alt: alt.ar }, locale: 'ar', user, overrideAccess: false, depth: 0 })
  return media.id
}

interface Row {
  id?: string
  kind: 'image' | 'video'
  image: number | null
  videoUrl: string
  category: number | null
  caption: { en: string; ar: string }
}

/** The latest draft's samples with both languages' captions. */
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

/**
 * Writes the samples of the draft in both languages: English first (new rows get their ids), then Arabic
 * on the same rows, so neither language's captions are lost by an edit made in the other.
 */
async function writeRows(payload: Payload, user: User, profileId: number, rows: Row[], publish: boolean) {
  const status = publish ? ({ _status: 'published' } as const) : {}
  const common = { collection: 'creator-profiles', id: profileId, draft: !publish, user, overrideAccess: false, depth: 0 } as const
  const shared = (r: Row) => ({ kind: r.kind, image: r.image, videoUrl: r.videoUrl || null, category: r.category })
  const en = await payload.update({
    ...common,
    locale: 'en',
    data: { ...status, samples: rows.map((r) => ({ ...(r.id ? { id: r.id } : {}), ...shared(r), caption: r.caption.en })) } as never,
  })
  const ids = ((en.samples ?? []) as { id?: string }[]).map((s) => s.id)
  await payload.update({
    ...common,
    locale: 'ar',
    data: { ...status, samples: rows.map((r, i) => ({ id: ids[i], ...shared(r), caption: r.caption.ar || null })) } as never,
  })
}

/** The captions and specialties edited on the sample rows (`sample.N.caption_en` …), validated before anything is written. */
function readSampleEdits(form: FormData, rows: Row[]): { rows: Row[]; changed: boolean } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  let changed = false
  const next = rows.map((row, i) => {
    if (!form.has(`sample.${i}.caption_en`)) return row
    const parsed = parseSampleForm({ kind: row.kind, videoUrl: row.videoUrl, caption_en: text(form, `sample.${i}.caption_en`), caption_ar: text(form, `sample.${i}.caption_ar`), category: text(form, `sample.${i}.category`) })
    if (!parsed.ok) {
      for (const [field, messages] of Object.entries(parsed.errors)) errors[`sample.${i}.${field}`] = messages[0] as string
      return row
    }
    const category = parsed.data.category ? Number(parsed.data.category) : null
    if (parsed.data.caption.en !== row.caption.en || parsed.data.caption.ar !== row.caption.ar || category !== row.category) changed = true
    return { ...row, caption: parsed.data.caption, category }
  })
  return Object.keys(errors).length ? { errors } : { rows: next, changed }
}

/** Saves the profile fields (both languages); creates the profile on the first save. */
async function saveProfile(payload: Payload, user: User, form: FormData): Promise<{ state: ProfileState } | { id: number; published: boolean }> {
  const parsed = parseProfileForm(readProfileForm(form))
  if (!parsed.ok) {
    return { state: { status: 'error', errors: Object.fromEntries(Object.entries(parsed.errors).map(([k, v]) => [k, v[0] as string])), formError: 'creators.errors.generic' } }
  }
  const input = parsed.data
  const existing = await myProfile(payload, user)
  const publish = await publishesAtOnce(payload, existing?.id ?? null)
  // Sample captions travel with the one form, so the closing action never loses an edit made on a row.
  const edits = existing ? readSampleEdits(form, await readRows(payload, existing.id)) : null
  if (edits && 'errors' in edits) return { state: { status: 'error', errors: edits.errors, formError: 'creators.errors.generic' } }
  const photo = form.get('photo')
  let photoId: number | undefined
  if (hasFile(photo)) {
    try {
      photoId = await upload(payload, user, photo, { en: `${input.displayName.en}`, ar: input.displayName.ar })
    } catch (error) {
      const mapped = fromPayloadError(error)
      if (mapped?.status === 'error' && mapped.formError) return { state: { status: 'error', errors: { photo: mapped.formError }, formError: 'creators.errors.generic' } }
      throw error
    }
  }
  const shared = {
    personas: input.personas.map(Number),
    specialties: input.specialties.map(Number),
    cities: input.cities.map(Number),
    languages: input.languages,
    gender: input.gender,
    nationality: input.nationality,
    yearsExperience: input.yearsExperience,
    social: input.social,
    ...(photoId !== undefined ? { photo: photoId } : {}),
  }
  const status = publish ? ({ _status: 'published' } as const) : {}
  const common = { collection: 'creator-profiles', draft: !publish, user, overrideAccess: false, depth: 0 } as const
  try {
    const id =
      existing?.id ??
      (await payload.create({ ...common, draft: true, locale: 'en', data: { ...shared, displayName: input.displayName.en, bio: input.bio.en, user: user.id, _status: 'draft' } as never })).id
    if (existing) {
      await payload.update({ ...common, id, locale: 'en', data: { ...shared, ...status, displayName: input.displayName.en, bio: input.bio.en } as never })
    }
    // A blank Arabic name is left alone when publishing (the field is required there); drafts may clear it.
    await payload.update({
      ...common,
      id,
      locale: 'ar',
      data: { ...status, ...(input.displayName.ar || !publish ? { displayName: input.displayName.ar || null } : {}), bio: input.bio.ar || null } as never,
    })
    if (edits && 'rows' in edits && edits.changed) await writeRows(payload, user, id, edits.rows, publish)
    return { id, published: publish }
  } catch (error) {
    const mapped = fromPayloadError(error)
    if (mapped) return { state: mapped }
    throw error
  }
}

/** Saves the profile's fields (CP-US3-S1). A draft, or live at once for a verified creator when the owner allows it. */
export async function saveMyProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await provider()
  if (!user) return notProvider()
  const payload = await getPayloadClient()
  const saved = await saveProfile(payload, user, form)
  if ('state' in saved) return saved.state
  refresh()
  return { status: 'saved', published: saved.published }
}

/** Saves, then asks the admin to review: the listing gets a review date once nothing required is missing. */
export async function submitForReview(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await provider()
  if (!user) return notProvider()
  const payload = await getPayloadClient()
  const saved = await saveProfile(payload, user, form)
  if ('state' in saved) return saved.state
  const doc = await payload.findByID({ collection: 'creator-profiles', id: saved.id, draft: true, locale: 'en', fallbackLocale: false, depth: 0, overrideAccess: true })
  const missing = missingForReview({
    displayName: doc.displayName ?? '',
    personas: doc.personas ?? [],
    specialties: doc.specialties ?? [],
    cities: doc.cities ?? [],
    languages: doc.languages ?? [],
    gender: doc.gender ?? null,
    documents: await documentsInHand(payload, user),
  })
  if (missing.length) {
    refresh()
    return fail('creators.submit.incomplete', Object.fromEntries(missing.map((field) => [field, 'creators.errors.required'])))
  }
  const listing = (await payload.find({ collection: 'creator-listings', where: { profile: { equals: saved.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  // The ownership check is the lookup by session user above; the review date is written by the system, not the owner.
  if (listing) await payload.update({ collection: 'creator-listings', id: listing.id, data: { submittedAt: new Date().toISOString() }, overrideAccess: true })
  refresh()
  return { status: 'saved', published: saved.published, submitted: true }
}

/** CP-FR-013: whether the Emirates ID and trade license are uploaded and not rejected. */
async function documentsInHand(payload: Payload, user: User) {
  const { docs } = await payload.find({ collection: 'identity-documents', where: { user: { equals: user.id } }, depth: 0, pagination: false, select: { kind: true, status: true, createdAt: true }, overrideAccess: true })
  return identityProvided(identityStanding(docs.map((d) => ({ kind: d.kind, status: d.status, createdAt: d.createdAt }))))
}

/**
 * CP-FR-013: uploads an Emirates ID or trade license for the verification team. It waits for their check;
 * once stored, earlier uploads of the same kind are removed, so only the newest is ever kept.
 */
export async function uploadIdentityDocument(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await provider()
  if (!user) return notProvider()
  const kind = text(form, 'kind')
  if (!isIdentityDocumentKind(kind)) return fail('creators.identity.kind')
  const file = form.get('document')
  if (!hasFile(file)) return fail('creators.identity.file', { [kind]: 'creators.identity.file' })
  if (!isIdentityUploadType(file.type)) return fail('creators.identity.type', { [kind]: 'creators.identity.type' })
  if (file.size > MAX_IDENTITY_BYTES) return fail('creators.identity.size', { [kind]: 'creators.identity.size' })
  const payload = await getPayloadClient()
  const before = await payload.find({ collection: 'identity-documents', where: { and: [{ user: { equals: user.id } }, { kind: { equals: kind } }] }, depth: 0, pagination: false, select: { kind: true }, overrideAccess: true })
  try {
    await payload.create({
      collection: 'identity-documents',
      data: { kind, user: user.id, status: 'pending' },
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name || `${kind}`, size: file.size },
      user,
      overrideAccess: false,
      depth: 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/^creators\.identity\./.test(message)) return fail(message, { [kind]: message })
    throw error
  }
  // The replaced files are the owner's own; the server removes them (providers cannot delete).
  if (before.docs.length) await payload.delete({ collection: 'identity-documents', where: { id: { in: before.docs.map((d) => d.id) } }, overrideAccess: true })
  refresh()
  return { status: 'saved', published: false }
}

/** The form's one action: the button pressed (`intent`) decides between saving and sending for review. */
export async function submitProfileForm(prev: ProfileState, form: FormData): Promise<ProfileState> {
  return text(form, 'intent') === 'send' ? submitForReview(prev, form) : saveMyProfile(prev, form)
}

/** Pause or resume the profile: at once, and never publishes pending edits (research §18). */
export async function setProfileActive(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await provider()
  if (!user) return notProvider()
  const payload = await getPayloadClient()
  const profile = await myProfile(payload, user)
  if (!profile) return fail('creators.errors.noProfile')
  const listing = (await payload.find({ collection: 'creator-listings', where: { profile: { equals: profile.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!listing) return fail('creators.errors.noProfile')
  await payload.update({ collection: 'creator-listings', id: listing.id, data: { active: text(form, 'active') === 'true' }, user, overrideAccess: false })
  refresh()
  return { status: 'saved', published: false }
}

/** Adds a portfolio sample: an image, or a video link with a poster (CP-US3-S1, CP-FR-008). */
export async function addSample(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await provider()
  if (!user) return notProvider()
  const payload = await getPayloadClient()
  const profile = await myProfile(payload, user)
  if (!profile) return fail('creators.errors.noProfile')
  const parsed = parseSampleForm({
    kind: text(form, 'kind'),
    videoUrl: text(form, 'videoUrl'),
    caption_en: text(form, 'caption_en'),
    caption_ar: text(form, 'caption_ar'),
    category: text(form, 'category'),
  })
  if (!parsed.ok) return { status: 'error', errors: Object.fromEntries(Object.entries(parsed.errors).map(([k, v]) => [k, v[0] as string])), formError: 'creators.errors.generic' }
  const sample = parsed.data

  const rows = await readRows(payload, profile.id)
  if (!canAddSample(rows.length)) return { status: 'error', errors: { sample: 'creators.samples.limit' }, formError: 'creators.samples.limit' }
  const category = sample.category ? Number(sample.category) : null
  if (category !== null && !((profile.specialties ?? []) as unknown[]).map((s) => Number(relId(s))).includes(category)) {
    return { status: 'error', errors: { category: 'creators.samples.category' }, formError: 'creators.errors.generic' }
  }
  const file = form.get(sample.kind === 'video' ? 'poster' : 'image')
  if (!hasFile(file)) return { status: 'error', errors: { [sample.kind === 'video' ? 'poster' : 'image']: sample.kind === 'video' ? 'creators.samples.poster' : 'creators.samples.image' }, formError: 'creators.errors.generic' }

  // Payload's own `image/*` filter would answer a text file with a generic failure; say what is wrong instead.
  const fileField = sample.kind === 'video' ? 'poster' : 'image'
  if (!(ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(file.type)) return { status: 'error', errors: { [fileField]: 'media.upload.type' }, formError: 'creators.errors.generic' }
  if (file.size > MAX_UPLOAD_BYTES) return { status: 'error', errors: { [fileField]: 'media.upload.size' }, formError: 'creators.errors.generic' }

  let mediaId: number
  try {
    const name = ((profile.displayName as unknown as string | undefined) ?? '').trim()
    mediaId = await upload(payload, user, file, {
      en: sample.caption.en || (name ? `Portfolio sample by ${name}` : 'Portfolio sample'),
      ar: sample.caption.ar,
    })
  } catch (error) {
    const mapped = fromPayloadError(error)
    if (mapped?.status === 'error' && mapped.formError) return { status: 'error', errors: { [sample.kind === 'video' ? 'poster' : 'image']: mapped.formError }, formError: 'creators.errors.generic' }
    throw error
  }

  try {
    await writeRows(payload, user, profile.id, [...rows, { kind: sample.kind, image: mediaId, videoUrl: sample.videoUrl ?? '', category, caption: sample.caption }], await publishesAtOnce(payload, profile.id))
  } catch (error) {
    const mapped = fromPayloadError(error)
    if (mapped) return mapped
    throw error
  }
  refresh()
  return { status: 'saved', published: false }
}

const indexOf = (form: FormData) => Number.parseInt(text(form, 'index'), 10)

async function editRows(form: FormData, edit: (rows: Row[], index: number) => Row[] | ProfileState): Promise<ProfileState> {
  const user = await provider()
  if (!user) return notProvider()
  const payload = await getPayloadClient()
  const profile = await myProfile(payload, user)
  if (!profile) return fail('creators.errors.noProfile')
  const rows = await readRows(payload, profile.id)
  const next = edit(rows, indexOf(form))
  if (!Array.isArray(next)) return next
  try {
    await writeRows(payload, user, profile.id, next, await publishesAtOnce(payload, profile.id))
  } catch (error) {
    const mapped = fromPayloadError(error)
    if (mapped) return mapped
    throw error
  }
  refresh()
  return { status: 'saved', published: false }
}

export async function moveSample(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const direction = text(form, 'direction') === 'up' ? 'up' : 'down'
  return editRows(form, (rows, index) => moveItem(rows, index, direction))
}

/** Removes the row; the uploaded file stays until the cleanup job finds it unreferenced. */
export async function removeSample(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  return editRows(form, (rows, index) => removeItem(rows, index))
}
