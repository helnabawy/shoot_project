import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { compareBoxes, type Box } from '../src/geometry'
import {
  comparableScreens,
  goldensDir,
  loadManifest,
  needsReview,
  overrides,
  refsDir,
  toolRoot,
  skippedScreens,
  thresholdOf,
  type Screen,
  type Variant,
} from '../src/manifest'
import { overlay, pixelDiff, sideBySide, withBlock } from '../src/review'
import { derivedVariants } from '../src/variants'

const manifest = loadManifest()
const tolerance = manifest.defaults.geometryTolerancePx
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

interface Result {
  id: string
  variant: string
  diffRatio: number
  threshold: number
  boxes: ReturnType<typeof compareBoxes>['deltas']
  pass: boolean
  failures: string[]
}

/** Both gates for one golden against its board reference; attaches the review images. */
async function gate(
  page: Page,
  screen: Screen,
  variant: Variant,
  app: Buffer,
  appBoxes: Record<string, Box>,
  attach: (name: string, body: Buffer, contentType: string) => Promise<void>,
  fixture = false,
): Promise<Result> {
  const refPng = join(refsDir, screen.id, `${variant}.png`)
  const refBoxes = join(refsDir, screen.id, `${variant}.boxes.json`)
  // A missing reference fails: references are rendered from the board, never written from the app.
  expect(existsSync(refPng), `missing reference ${screen.id}/${variant}; run the refs project`).toBe(true)
  const board = readFileSync(refPng)
  const threshold = thresholdOf(manifest, screen)
  const px = await pixelDiff(page, board, app)
  const geo = compareBoxes(readJson(refBoxes), appBoxes, tolerance)
  const failures = [...geo.failures]
  if (px.ratio > threshold) {
    failures.unshift(`diffRatio ${px.ratio.toFixed(4)} > threshold ${threshold} (${px.diffPixels} of ${px.total} px)`)
  }
  const result: Result = {
    id: screen.id,
    variant,
    diffRatio: Number(px.ratio.toFixed(6)),
    threshold,
    boxes: geo.deltas,
    pass: failures.length === 0,
    failures,
  }
  const images = {
    'side-by-side.png': await sideBySide(page, board, app, px.diff),
    'overlay.png': await overlay(page, board, app),
    'result.json': Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
  }
  for (const [name, body] of Object.entries(images)) {
    await attach(name, body, name.endsWith('.json') ? 'application/json' : 'image/png')
  }
  if (!fixture) {
    // Also kept outside the report, for the finish review and the calibration in research R9.
    const dir = join(toolRoot, 'build/results', screen.id, variant)
    mkdirSync(dir, { recursive: true })
    for (const [name, body] of Object.entries(images)) writeFileSync(join(dir, name), body)
  }
  return result
}

test.describe('report', () => {
  test('screens needing review, skipped screens and overrides', async ({}, testInfo) => {
    const lines = [
      `Needs review (changed since the last export): ${needsReview(manifest).map((s) => s.id).join(', ') || 'none'}`,
      `Skipped (feature not shipped): ${skippedScreens(manifest).map((s) => s.id).join(', ') || 'none'}`,
      `Overrides: ${overrides(manifest).map((s) => `${s.id} ${s.threshold} (${s.reason})`).join('; ') || 'none'}`,
    ]
    await testInfo.attach('report.txt', { body: lines.join('\n'), contentType: 'text/plain' })
    testInfo.annotations.push(...lines.map((description) => ({ type: 'report', description })))
  })
})

for (const screen of comparableScreens(manifest)) {
  for (const variant of derivedVariants(screen.variants)) {
    const label = variant === 'en-light' ? 'MF-US1-S1' : 'MF-US2-S3'
    test(`${label} screen ${screen.id} ${variant} matches its board`, async ({ page }, testInfo) => {
      const goldenPng = join(goldensDir, screen.id, `${variant}.png`)
      expect(existsSync(goldenPng), `missing app golden ${screen.id}/${variant}; run tool/goldens.sh --update`).toBe(true)
      const app = readFileSync(goldenPng)
      const result = await gate(page, screen, variant, app, readJson(join(goldensDir, screen.id, `${variant}.boxes.json`)), (n, b, c) =>
        testInfo.attach(n, { body: b, contentType: c }),
      )
      // Playwright's own expected / actual / diff images, at the same tolerance.
      expect.soft(app).toMatchSnapshot([screen.id, `${variant}.png`], {
        maxDiffPixelRatio: result.threshold,
        threshold: 0.2,
      })
      expect(result.failures, `screen ${screen.id} ${variant}`).toEqual([])
    })
  }
}

// The gates themselves, on fixtures derived from screen 37's reference.
test.describe('the gates catch real differences', () => {
  const screen = manifest.screens.find((s) => s.id === '37')!

  test('MF-US1-S2 a 2 px shift of the heading fails and names the element', async ({ page }, testInfo) => {
    const board = readFileSync(join(refsDir, '37', 'en-light.png'))
    const boxes = readJson<Record<string, Box>>(join(refsDir, '37', 'en-light.boxes.json'))
    const shifted = { ...boxes, h1: { ...boxes.h1!, y: boxes.h1!.y + 2 } }
    const result = await gate(page, screen, 'en-light', board, shifted, (n, b, c) => testInfo.attach(n, { body: b, contentType: c }), true)
    expect(result.pass).toBe(false)
    expect(result.failures.join('\n')).toMatch(/^h1: dy=2 /m)
  })

  test('MF-US1-S3 a colour difference over the threshold fails with the ratio', async ({ page }, testInfo) => {
    const board = readFileSync(join(refsDir, '37', 'en-light.png'))
    const boxes = readJson<Record<string, Box>>(join(refsDir, '37', 'en-light.boxes.json'))
    const recoloured = await withBlock(page, board, 0.025)
    const result = await gate(page, screen, 'en-light', recoloured, boxes, (n, b, c) => testInfo.attach(n, { body: b, contentType: c }), true)
    expect(result.pass).toBe(false)
    expect(result.diffRatio).toBeGreaterThan(0.02)
    expect(result.failures[0]).toMatch(/^diffRatio 0\.02\d+ > threshold 0\.01/)
  })
})
