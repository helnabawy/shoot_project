/**
 * The kept brief (feature 021): a guest's validated brief, held on their device while they sign in,
 * then sent for them. Only answers travel (FR-017): never a number, a code or a session, and the server
 * checks everything again when it records the brief. Browser-safe (no zod, no Node APIs), so the
 * brief builder can read it back on a static page.
 */

/** The cookie that holds it on the website. */
export const KEPT_BRIEF_COOKIE = 'shoot-brief'
/** One hour: long enough to get and type a code (codes live ten minutes), short enough not to surprise. */
export const KEPT_BRIEF_MAX_AGE_S = 60 * 60
/** A cookie is at most 4 KB; stay well under it with the name and attributes. */
const MAX_ENCODED = 3000
const MAX_ENTRIES = 40
const MAX_VALUE = 200
/** A kept brief stamped up to this far ahead of the reader's clock still counts. */
const CLOCK_SKEW_MS = 2 * 60 * 1000
const CUSTOM_SUFFIX = '__custom'
const EXTRA_FIELDS = new Set(['creator', 'pick'])
const LOCALES = new Set(['en', 'ar'])

export interface KeptBriefError {
  /** Slot token to message key, as the brief shows them. */
  errors: Record<string, string>
  formError?: string
}

export interface KeptBrief {
  v: 1
  /** When it was kept (ISO). */
  at: string
  /** The builder's source page (`/`, `/book/…`, `/hire/…`). */
  path: string
  locale: string
  /** The sentence as the guest built it, shown on the sign-in screen only. */
  sentence: string
  /** The brief's form fields: slot answers, typed words, the creator and their pick. */
  entries: [string, string][]
  /** Why it could not be sent after sign-in. */
  error?: KeptBriefError
}

/** The fields of a brief form worth keeping: slot answers (and typed words), the creator and the pick. */
export function keptEntries(entries: Iterable<[string, unknown]>, tokens: readonly string[]): [string, string][] {
  const allowed = new Set(tokens)
  const kept: [string, string][] = []
  for (const [name, value] of entries) {
    if (typeof value !== 'string') continue
    const base = name.endsWith(CUSTOM_SUFFIX) ? name.slice(0, -CUSTOM_SUFFIX.length) : name
    if (!allowed.has(base) && !EXTRA_FIELDS.has(name)) continue
    kept.push([name, value.slice(0, MAX_VALUE)])
    if (kept.length === MAX_ENTRIES) break
  }
  return kept
}

/** The first value of [name], or ''. */
export const keptValue = (kept: KeptBrief, name: string): string => kept.entries.find(([n]) => n === name)?.[1] ?? ''

/** The cookie value (base64url JSON), or null when it would not fit in a cookie. */
export function encodeKeptBrief(kept: KeptBrief): string | null {
  const bytes = new TextEncoder().encode(JSON.stringify(kept))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return encoded.length > MAX_ENCODED ? null : encoded
}

const isText = (v: unknown): v is string => typeof v === 'string'
const isTextRecord = (v: unknown): v is Record<string, string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(isText)

/** Reads a cookie value back; anything that is not a kept brief of this version is null. */
export function decodeKeptBrief(raw: string | null | undefined): KeptBrief | null {
  if (!raw) return null
  let data: unknown
  try {
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
    data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))))
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  const d = data as Record<string, unknown>
  if (d.v !== 1 || !isText(d.at) || !isText(d.sentence) || !isText(d.locale) || !LOCALES.has(d.locale)) return null
  if (!isText(d.path) || !d.path.startsWith('/') || d.path.startsWith('//') || d.path.includes('\\')) return null
  if (!Array.isArray(d.entries) || !d.entries.every((e) => Array.isArray(e) && e.length === 2 && isText(e[0]) && isText(e[1]))) return null
  const kept: KeptBrief = { v: 1, at: d.at, path: d.path, locale: d.locale, sentence: d.sentence, entries: d.entries as [string, string][] }
  if (d.error !== undefined) {
    const e = d.error as Record<string, unknown> | null
    if (typeof e !== 'object' || e === null || !isTextRecord(e.errors) || (e.formError !== undefined && !isText(e.formError))) return null
    kept.error = { errors: e.errors, ...(e.formError !== undefined ? { formError: e.formError as string } : {}) }
  }
  return kept
}

/** Kept less than an hour ago (FR-008). */
export function isKeptBriefFresh(kept: KeptBrief, now: Date): boolean {
  const at = Date.parse(kept.at)
  if (Number.isNaN(at)) return false
  const age = now.getTime() - at
  return age >= -CLOCK_SKEW_MS && age < KEPT_BRIEF_MAX_AGE_S * 1000
}

/** The kept brief belongs to this builder: the same page, language and creator (or none). */
export function keptBriefMatches(kept: KeptBrief, builder: { path: string; locale: string; creator?: string | null }): boolean {
  return kept.path === builder.path && kept.locale === builder.locale && keptValue(kept, 'creator') === (builder.creator ?? '')
}
