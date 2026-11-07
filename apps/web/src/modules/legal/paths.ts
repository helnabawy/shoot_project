import { LEGAL_PATHS, type LegalKind } from '@shoot/domain/pages'

/** The public address of a legal document in a language (config-safe: no server-only imports). */
export const legalPath = (kind: LegalKind, locale: string): string => (locale === 'ar' ? `/ar${LEGAL_PATHS[kind]}` : LEGAL_PATHS[kind])

/** Where the editor's Preview button goes. */
export const LEGAL_PATH_PREVIEW = (doc: { kind?: string } | null | undefined, locale: string): string =>
  doc?.kind && doc.kind in LEGAL_PATHS ? legalPath(doc.kind as LegalKind, locale) : '/'
