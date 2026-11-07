import { lexicalToText } from '@shoot/domain/content'
import { checkVersions, type LegalVersionRow } from '@shoot/domain/pages'
import {
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterReadHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'
import { hasRole, isEditorUser } from '@/shared/payload/access'
import { safeRevalidate } from '@/shared/payload/hooks/revalidate'

type Row = Record<string, unknown> & LegalVersionRow & { id?: string }

const MESSAGES: Record<string, string> = {
  'legal.version.sameDate': 'Two published versions cannot start at the same moment. Change the effective date of one.',
  'legal.version.placeholder': 'A version marked as a placeholder cannot be published. Replace the text and untick the box.',
  'legal.version.removed': 'A published version cannot be removed, not even by an administrator. Add a newer version instead.',
  'legal.version.immutable': 'A published version cannot be edited. Add a newer version instead (an administrator can correct a typo).',
  'legal.kind.immutable': 'The kind of a legal document cannot be changed.',
}

const fail = (req: PayloadRequest, errors: { path: string; message: string }[]): never => {
  throw new ValidationError({ collection: 'legal-documents', errors, req })
}

const rowsOf = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : [])

/** New rows get the next version number; existing rows keep theirs, whatever the client sent. */
export const prepareLegalVersions: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data || !Array.isArray(data.versions)) return data
  const stored = rowsOf(originalDoc?.versions)
  const byId = new Map(stored.filter((r) => r.id).map((r) => [r.id, r]))
  let highest = stored.reduce((max, r) => Math.max(max, r.version ?? 0), 0)
  const versions = rowsOf(data.versions).map((row) => {
    const known = row.id ? byId.get(row.id) : undefined
    if (known) return { ...row, version: known.version }
    highest += 1
    return { ...row, version: highest }
  })
  return { ...data, versions }
}

/** Words already there may not change; a language the version was published without may be filled in later (a translation). */
const sameWords = (native: Row | undefined, after: Row): boolean => {
  if (!native) return true
  const body = lexicalToText(native.body)
  const summary = native.changeSummary ?? ''
  return (!body || body === lexicalToText(after.body)) && (!summary || summary === (after.changeSummary ?? ''))
}

/** What may not change in a published version: when it applies, its state and the words it was published with. */
const unchanged = (before: Row, after: Row, native: Row | undefined): boolean =>
  before.state === after.state &&
  (before.effectiveFrom ?? null) === (after.effectiveFrom ?? null) &&
  Boolean(before.placeholder) === Boolean(after.placeholder) &&
  sameWords(native, after)

/** The stored rows as written in the language being saved, without English standing in for a missing translation. */
async function nativeRows(req: PayloadRequest, id: unknown): Promise<Map<string | undefined, Row>> {
  if (id === undefined || id === null) return new Map()
  const { locale, fallbackLocale } = req
  try {
    const doc = await req.payload.findByID({
      collection: 'legal-documents',
      id: id as number,
      locale: locale === 'ar' ? 'ar' : 'en',
      fallbackLocale: false,
      depth: 0,
      req,
      overrideAccess: true,
      context: { includeDraftVersions: true },
    })
    return new Map(rowsOf(doc.versions).map((r) => [r.id, r]))
  } finally {
    req.locale = locale
    req.fallbackLocale = fallbackLocale
  }
}

/**
 * The rules of the version list (FR-006, FR-018): published versions are immutable for editors,
 * placeholders cannot be published, dates are unique; publishing stamps who and when.
 * Trusted server code (the seed) has no user and is not held to the editor rules.
 */
export const guardLegalVersions: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation === 'update' && originalDoc?.kind && data.kind && data.kind !== originalDoc.kind) {
    fail(req, [{ path: 'kind', message: MESSAGES['legal.kind.immutable']! }])
  }
  if (!Array.isArray(data.versions)) return data
  const admin = hasRole(req.user as never, 'admin') || !req.user
  const stored = rowsOf(originalDoc?.versions)
  const storedById = new Map(stored.filter((r) => r.id).map((r) => [r.id, r]))
  const native = admin ? new Map<string | undefined, Row>() : await nativeRows(req, originalDoc?.id)
  const now = new Date().toISOString()
  const errors: { path: string; message: string }[] = []

  const versions = rowsOf(data.versions).map((row) => {
    const before = row.id ? storedById.get(row.id) : undefined
    if (before?.state === 'published' && !admin && !unchanged(before, row, native.get(row.id))) {
      errors.push({ path: 'versions', message: MESSAGES['legal.version.immutable']! })
    }
    if (row.state === 'published' && before?.state !== 'published') {
      return { ...row, publishedAt: now, publishedBy: req.user?.id ?? null, effectiveFrom: row.effectiveFrom ?? now }
    }
    return row
  })

  for (const key of checkVersions(versions, stored)) errors.push({ path: 'versions', message: MESSAGES[key]! })
  if (errors.length > 0) fail(req, errors)
  return { ...data, versions }
}

/**
 * The public never sees draft versions. Server-side preview opts in with `context.includeDraftVersions`
 * (not settable over REST); signed-in editors always see them.
 */
export const filterDraftVersions: CollectionAfterReadHook = ({ doc, req }) => {
  if (!Array.isArray(doc?.versions) || isEditorUser(req.user) || req.context?.includeDraftVersions === true) return doc
  return { ...doc, versions: rowsOf(doc.versions).filter((row) => row.state === 'published') }
}

export const afterLegalChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (!req.context?.disableRevalidate) safeRevalidate('legal-documents')
  return doc
}
