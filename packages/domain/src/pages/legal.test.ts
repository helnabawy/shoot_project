import { describe, expect, it } from 'vitest'
import { checkVersions, currentVersion, LEGAL_KINDS, LEGAL_PATHS, nextVersionNumber, upcomingVersion, versionPeriods, type LegalVersionRow } from './legal'

const v = (version: number, from: string | null, extra: Partial<LegalVersionRow> = {}): LegalVersionRow => ({ version, state: 'published', effectiveFrom: from, ...extra })
const NOW = new Date('2026-11-07T12:00:00Z')

describe('MP-US2-S3 currentVersion / upcomingVersion', () => {
  const rows = [v(1, '2026-01-01T00:00:00Z'), v(2, '2026-11-01T00:00:00Z'), v(3, '2027-01-01T00:00:00Z'), v(4, '2026-12-01T00:00:00Z'), v(5, '2026-12-15T00:00:00Z', { state: 'draft' })]

  it('is the published version with the latest start that has begun', () => {
    expect(currentVersion(rows, NOW)?.version).toBe(2)
    expect(currentVersion(rows, new Date('2026-12-02T00:00:00Z'))?.version).toBe(4)
    expect(currentVersion(rows, new Date('2026-11-01T00:00:00Z'))?.version).toBe(2)
  })

  it('is null before any version has begun, with no rows, and ignores drafts', () => {
    expect(currentVersion(rows, new Date('2025-01-01T00:00:00Z'))).toBeNull()
    expect(currentVersion([], NOW)).toBeNull()
    expect(currentVersion([v(1, '2026-01-01T00:00:00Z', { state: 'draft' })], NOW)).toBeNull()
  })

  it('announces the next published version that has not begun, never a draft', () => {
    expect(upcomingVersion(rows, NOW)?.version).toBe(4)
    expect(upcomingVersion(rows, new Date('2030-01-01T00:00:00Z'))).toBeNull()
    expect(upcomingVersion([], NOW)).toBeNull()
  })

  it('starts at the publish time when no effective date is set', () => {
    const noDate = [{ version: 1, state: 'published' as const, effectiveFrom: null, publishedAt: '2026-06-01T00:00:00Z' }]
    expect(currentVersion(noDate, NOW)?.version).toBe(1)
    expect(currentVersion([{ version: 1, state: 'published' as const }], NOW)).toBeNull()
    expect(currentVersion([{ version: 1, state: 'published' as const, effectiveFrom: 'not a date' }], NOW)).toBeNull()
  })
})

describe('MP-US2-S4 versionPeriods / nextVersionNumber', () => {
  it('gives each published version its period, oldest first, the latest open-ended', () => {
    expect(versionPeriods([v(2, '2026-11-01T00:00:00Z'), v(1, '2026-01-01T00:00:00Z'), v(3, '2027-01-01T00:00:00Z', { state: 'draft' })])).toEqual([
      { version: 1, from: '2026-01-01T00:00:00.000Z', until: '2026-11-01T00:00:00.000Z' },
      { version: 2, from: '2026-11-01T00:00:00.000Z', until: null },
    ])
    expect(versionPeriods([])).toEqual([])
  })

  it('numbers new versions after the highest, starting at 1', () => {
    expect(nextVersionNumber([])).toBe(1)
    expect(nextVersionNumber([v(1, null), v(4, null), { state: 'draft' }])).toBe(5)
  })
})

describe('MP-FR-006 checkVersions', () => {
  it('accepts a sound list', () => {
    expect(checkVersions([v(1, '2026-01-01T00:00:00Z'), v(2, '2026-02-01T00:00:00Z')], [v(1, '2026-01-01T00:00:00Z')])).toEqual([])
  })

  it('refuses two published versions with the same start', () => {
    expect(checkVersions([v(1, '2026-01-01T00:00:00Z'), v(2, '2026-01-01T00:00:00Z')])).toEqual(['legal.version.sameDate'])
    expect(checkVersions([v(1, '2026-01-01T00:00:00Z'), v(2, '2026-01-01T00:00:00Z', { state: 'draft' })])).toEqual([])
  })

  it('refuses publishing placeholder text, but allows it as a draft', () => {
    expect(checkVersions([v(1, '2026-01-01T00:00:00Z', { placeholder: true })])).toEqual(['legal.version.placeholder'])
    expect(checkVersions([v(1, '2026-01-01T00:00:00Z', { placeholder: true, state: 'draft' })])).toEqual([])
  })

  it('refuses taking away a published version, but not a draft', () => {
    const stored = [v(1, '2026-01-01T00:00:00Z'), v(2, null, { state: 'draft' })]
    expect(checkVersions([], stored)).toEqual(['legal.version.removed'])
    expect(checkVersions([v(1, '2026-01-01T00:00:00Z')], stored)).toEqual([])
  })
})

describe('legal kinds', () => {
  it('have a fixed public address each', () => {
    expect(LEGAL_KINDS.map((k) => LEGAL_PATHS[k])).toEqual(['/terms', '/terms/professional', '/privacy'])
  })
})
