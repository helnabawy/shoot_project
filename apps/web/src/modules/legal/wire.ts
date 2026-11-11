import type { LegalDocumentV1, LegalVersionsV1, LegalVersionV1 } from '@shoot/domain/api/v1'
import type { LegalKind } from '@shoot/domain/pages'
import { toWireRichText, type WireContext } from '@/shared/api/wire'
import type { LegalVersionView, LegalView } from './queries'

const iso = (value: string) => new Date(value).toISOString()

/** One version of a legal document, its body as v1 rich text. */
export function toWireLegalVersion(view: LegalVersionView, ctx: WireContext): LegalVersionV1 {
  return {
    locale: ctx.locale,
    kind: view.kind,
    title: view.title,
    version: view.version,
    effectiveFrom: iso(view.effectiveFrom),
    until: view.until ? iso(view.until) : null,
    body: toWireRichText(view.body, ctx.base),
    inRequestedLanguage: !view.fallback,
  }
}

/** The version in force, with a later published version announced. */
export function toWireLegalDocument(view: LegalView, ctx: WireContext): LegalDocumentV1 {
  return {
    ...toWireLegalVersion(view, ctx),
    upcoming: view.upcoming ? { version: view.upcoming.version, effectiveFrom: iso(view.upcoming.effectiveFrom) } : null,
  }
}

export interface LegalVersionsInput {
  title: string
  versions: readonly { version: number; from: string; until: string | null; changeSummary: string | null }[]
}

/** Every published version with its period, newest first. */
export function toWireLegalVersions(kind: LegalKind, input: LegalVersionsInput, ctx: WireContext): LegalVersionsV1 {
  return {
    locale: ctx.locale,
    kind,
    title: input.title,
    versions: input.versions.map((v) => ({ version: v.version, from: iso(v.from), until: v.until ? iso(v.until) : null, changeSummary: v.changeSummary || null })),
  }
}
