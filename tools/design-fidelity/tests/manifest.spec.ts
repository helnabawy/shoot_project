import { expect, test } from '@playwright/test'
import {
  comparableScreens,
  loadManifest,
  ManifestError,
  needsReview,
  skippedScreens,
  validateManifest,
  type Manifest,
} from '../src/manifest'

const copy = (): Manifest => structuredClone(loadManifest())

test.describe('manifest', () => {
  test('the committed manifest is valid', () => {
    const m = loadManifest()
    expect(m.screens.length).toBeGreaterThan(40)
  })

  test('MF-US1-S4 a threshold override without a reason is refused', () => {
    const m = copy()
    const s = m.screens.find((x) => x.id === '37')!
    s.threshold = 0.02
    delete s.reason
    expect(() => validateManifest(m)).toThrow(ManifestError)
    expect(() => validateManifest(m)).toThrow(/screen 37 .*no reason/)

    s.reason = 'Long running text: more anti-aliased edges.'
    expect(() => validateManifest(m)).not.toThrow()
  })

  test('MF-US1-S5 boards changed since the last export are listed for review', () => {
    const m = copy()
    expect(needsReview(m).map((s) => s.id)).toEqual(
      m.screens.filter((s) => s.changedSinceLastExport).map((s) => s.id),
    )
    m.screens.find((x) => x.id === '39')!.changedSinceLastExport = true
    m.screens.find((x) => x.id === '09')!.changedSinceLastExport = true
    expect(needsReview(m).map((s) => s.id)).toEqual(expect.arrayContaining(['09', '39']))
  })

  test('duplicate ids, missing boards and dangling variantOf are refused', () => {
    const dup = copy()
    dup.screens.push({ ...dup.screens[0]! })
    expect(() => validateManifest(dup)).toThrow(/duplicate id/)

    const missing = copy()
    missing.screens[0]!.board = 'no-such-board.dc.html'
    expect(() => validateManifest(missing)).toThrow(/board file is missing/)

    const dangling = copy()
    dangling.screens.find((x) => x.id === '42')!.variantOf = '99'
    expect(() => validateManifest(dangling)).toThrow(/variantOf 99/)
  })

  test('only shipped mobile screens are compared; the rest are listed as skipped', () => {
    const m = loadManifest()
    const shipped = new Set(['007-mobile-foundation'])
    expect(comparableScreens(m, shipped).map((s) => s.id).sort()).toEqual(['37', '39'])
    const skipped = skippedScreens(m, shipped).map((s) => s.id)
    expect(skipped).toContain('09')
    expect(skipped).not.toContain('41') // web
    expect(skipped).not.toContain('42') // designer variant
  })
})
