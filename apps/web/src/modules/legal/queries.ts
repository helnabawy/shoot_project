import 'server-only'
import {
  currentVersion,
  LEGAL_KINDS,
  upcomingVersion,
  versionPeriods,
  type LegalKind,
  type LegalVersionRow,
} from '@shoot/domain/pages'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { legalPath } from './paths'

type Localised<T> = Partial<Record<Locale, T | null>> | T | null | undefined

interface RawRow extends LegalVersionRow {
  body?: Localised<unknown>
  changeSummary?: Localised<string>
}

interface RawDocument {
  kind: LegalKind
  title: Localised<string>
  versions: RawRow[]
}

const pick = <T>(value: Localised<T>, locale: Locale): { value: T | null; native: boolean } => {
  if (value && typeof value === 'object' && ('en' in value || 'ar' in value)) {
    const byLocale = value as Partial<Record<Locale, T | null>>
    const own = byLocale[locale] ?? null
    return own !== null && own !== '' ? { value: own, native: true } : { value: byLocale.en ?? null, native: false }
  }
  return { value: (value as T | null) ?? null, native: true }
}

/** Every language of one document, published versions only (drafts with `draft`, for editors in preview). */
function getLegalRaw(kind: LegalKind, draft = false): Promise<RawDocument | null> {
  return cachedQuery(
    ['legal-documents'],
    ['legal', kind],
    async () => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'legal-documents',
        where: { kind: { equals: kind } },
        locale: 'all',
        fallbackLocale: false,
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: false,
        context: draft ? { includeDraftVersions: true } : {},
      })
      return (docs[0] as unknown as RawDocument | undefined) ?? null
    },
    { bypass: draft },
  )
}

export interface LegalVersionView {
  kind: LegalKind
  title: string
  version: number
  /** ISO start of the period this version applies. */
  effectiveFrom: string
  /** ISO end of the period; null for the latest. */
  until: string | null
  changeSummary: string | null
  body: unknown
  /** The reader's language has no text yet: the English text is shown. */
  fallback: boolean
}

export interface LegalView extends LegalVersionView {
  /** A published version that starts later, announced on the page. */
  upcoming: { version: number; effectiveFrom: string } | null
  /** Whether more than this version exists (the archive link is worth showing). */
  hasEarlier: boolean
}

function describe(doc: RawDocument, row: RawRow, locale: Locale): LegalVersionView {
  const periods = versionPeriods(doc.versions)
  const period = periods.find((p) => p.version === row.version)
  const body = pick(row.body, locale)
  return {
    kind: doc.kind,
    title: pick(doc.title, locale).value ?? '',
    version: row.version as number,
    effectiveFrom: period?.from ?? new Date(row.effectiveFrom ?? row.publishedAt ?? 0).toISOString(),
    until: period?.until ?? null,
    changeSummary: pick(row.changeSummary, locale).value,
    body: body.value,
    fallback: locale !== 'en' && !body.native,
  }
}

/** The version in force of a document, for the page at its fixed address. */
export async function getLegalDocument(kind: LegalKind, locale: Locale, { now = new Date(), draft = false }: { now?: Date; draft?: boolean } = {}): Promise<LegalView | null> {
  const doc = await getLegalRaw(kind, draft)
  if (!doc) return null
  const row = draft ? [...doc.versions].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] : currentVersion(doc.versions, now)
  if (!row) return null
  const later = upcomingVersion(doc.versions, now)
  return {
    ...describe(doc, row, locale),
    upcoming: later ? { version: later.version as number, effectiveFrom: new Date(later.effectiveFrom ?? later.publishedAt ?? 0).toISOString() } : null,
    hasEarlier: versionPeriods(doc.versions).length > 1,
  }
}

/** Every published version of a document with its period, newest first. */
export async function getLegalVersions(kind: LegalKind, locale: Locale): Promise<{ title: string; versions: { version: number; from: string; until: string | null; changeSummary: string | null }[] } | null> {
  const doc = await getLegalRaw(kind)
  if (!doc) return null
  const periods = versionPeriods(doc.versions)
  if (periods.length === 0) return null
  return {
    title: pick(doc.title, locale).value ?? '',
    versions: periods
      .map((p) => ({ ...p, changeSummary: pick(doc.versions.find((r) => r.version === p.version)?.changeSummary, locale).value }))
      .reverse(),
  }
}

/** One published version, to read as it stood. */
export async function getLegalVersion(kind: LegalKind, version: number, locale: Locale): Promise<LegalVersionView | null> {
  const doc = await getLegalRaw(kind)
  const row = doc?.versions.find((r) => r.version === version && r.state === 'published')
  return doc && row ? describe(doc, row, locale) : null
}

export interface LegalLink {
  kind: LegalKind
  label: string
  /** Site path without the language prefix. */
  href: string
}

/** The documents that have a version in force: the footer and the registration form link these. */
export async function getLegalLinks(locale: Locale, now = new Date()): Promise<LegalLink[]> {
  const docs = await Promise.all(LEGAL_KINDS.map((kind) => getLegalRaw(kind)))
  return docs.flatMap((doc) =>
    doc && currentVersion(doc.versions, now)
      ? [{ kind: doc.kind, label: pick(doc.title, locale).value ?? '', href: legalPath(doc.kind, 'en') }]
      : [],
  )
}

/** Link per kind for the registration form; null where the document has no version in force. */
export async function getLegalForRegistration(locale: Locale, now = new Date()): Promise<Record<LegalKind, { label: string; href: string } | null>> {
  const links = await getLegalLinks(locale, now)
  const find = (kind: LegalKind) => {
    const link = links.find((l) => l.kind === kind)
    return link ? { label: link.label, href: link.href } : null
  }
  return { terms: find('terms'), 'professional-terms': find('professional-terms'), privacy: find('privacy') }
}

/** The version in force of each kind, for acceptance records. */
export async function currentVersions(kinds: readonly LegalKind[], now = new Date()): Promise<{ kind: LegalKind; version: number }[]> {
  const docs = await Promise.all(kinds.map((kind) => getLegalRaw(kind)))
  return docs.flatMap((doc) => {
    const row = doc ? currentVersion(doc.versions, now) : null
    return doc && row ? [{ kind: doc.kind, version: row.version as number }] : []
  })
}
