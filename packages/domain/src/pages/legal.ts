/** The legal documents the site publishes, each with its fixed public address (spec US2). */
export const LEGAL_KINDS = ['terms', 'professional-terms', 'privacy'] as const
export type LegalKind = (typeof LEGAL_KINDS)[number]

export const LEGAL_PATHS: Record<LegalKind, string> = {
  terms: '/terms',
  'professional-terms': '/terms/professional',
  privacy: '/privacy',
}

export interface LegalVersionRow {
  version?: number | null
  state: 'draft' | 'published'
  /** ISO date from which the version applies; the publish time when empty. */
  effectiveFrom?: string | null
  publishedAt?: string | null
  placeholder?: boolean | null
}

export type LegalError = 'legal.version.sameDate' | 'legal.version.placeholder' | 'legal.version.removed'

const time = (row: LegalVersionRow): number | null => {
  const value = row.effectiveFrom ?? row.publishedAt ?? null
  const parsed = value ? Date.parse(value) : Number.NaN
  return Number.isNaN(parsed) ? null : parsed
}

const live = <T extends LegalVersionRow>(rows: readonly T[]): { row: T; at: number }[] =>
  rows.flatMap((row) => {
    const at = time(row)
    return row.state === 'published' && at !== null ? [{ row, at }] : []
  })

/** The version in force at `now`: the published one with the latest effective date that has begun. */
export function currentVersion<T extends LegalVersionRow>(rows: readonly T[], now: Date): T | null {
  const begun = live(rows).filter((v) => v.at <= now.getTime())
  return begun.length ? begun.reduce((a, b) => (b.at > a.at ? b : a)).row : null
}

/** The next published version that has not begun yet, if any. */
export function upcomingVersion<T extends LegalVersionRow>(rows: readonly T[], now: Date): T | null {
  const later = live(rows).filter((v) => v.at > now.getTime())
  return later.length ? later.reduce((a, b) => (b.at < a.at ? b : a)).row : null
}

export interface VersionPeriod {
  version: number
  from: string
  /** The next version's start; null while it is the latest. */
  until: string | null
}

/** Every published version with the period it applies, oldest first. */
export function versionPeriods(rows: readonly LegalVersionRow[]): VersionPeriod[] {
  const sorted = live(rows).sort((a, b) => a.at - b.at)
  return sorted.map((v, i) => ({
    version: v.row.version as number,
    from: new Date(v.at).toISOString(),
    until: sorted[i + 1] ? new Date(sorted[i + 1]!.at).toISOString() : null,
  }))
}

export function nextVersionNumber(rows: readonly LegalVersionRow[]): number {
  return rows.reduce((max, r) => Math.max(max, r.version ?? 0), 0) + 1
}

/** Rule violations in a document's versions; `previous` is the stored list, to catch removed published versions. */
export function checkVersions(rows: readonly LegalVersionRow[], previous: readonly LegalVersionRow[] = []): LegalError[] {
  const errors: LegalError[] = []
  const published = live(rows)
  if (new Set(published.map((v) => v.at)).size !== published.length) errors.push('legal.version.sameDate')
  if (rows.some((r) => r.state === 'published' && r.placeholder)) errors.push('legal.version.placeholder')
  const kept = new Set(rows.map((r) => r.version))
  if (previous.some((r) => r.state === 'published' && !kept.has(r.version))) errors.push('legal.version.removed')
  return errors
}
