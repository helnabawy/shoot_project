// Loads a canvas board the way the reference renderer needs it (contracts/fidelity-check.md).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { fontCss } from './fonts'
import { canvasDir, type Screen, type Variant } from './manifest'

/**
 * Board defects the reference renderer works around, until the canvas is fixed and re-exported
 * (boards are never patched in the repo). Each one is reported to the owner as a canvas change.
 *
 * - The Top Hit glint (`.top::after`): under `prefers-reduced-motion` the board sets
 *   `animation: none`, which leaves the sheen sitting on the button instead of finished off it.
 *   The app's end state has no sheen; hide it as the board's own `.top.off::after` does.
 */
const REFERENCE_FIXES = '.root .top::after{display:none!important}'

/** Transforms applied to the board's HTML before it loads (dark: tokenise; Arabic: localise). */
export type HtmlTransform = (html: string, screen: Screen) => string

/**
 * Opens [screen]'s board in [variant] on [page]: `support.js` stubbed, the test fonts injected,
 * [transforms] applied to the HTML, and the viewport at the board's size.
 */
export async function openBoard(
  page: Page,
  screen: Screen,
  variant: Variant,
  transforms: HtmlTransform[] = [],
): Promise<void> {
  const file = join(canvasDir, screen.board)
  let html = readFileSync(file, 'utf8')
  for (const t of transforms) html = t(html, screen)
  const fonts = `<style data-fidelity="fonts">${fontCss()}${REFERENCE_FIXES}</style>`
  html = html.includes('</head>') ? html.replace('</head>', `${fonts}</head>`) : fonts + html

  await page.setViewportSize({ width: screen.w, height: screen.h })
  await page.emulateMedia({
    reducedMotion: 'reduce',
    colorScheme: variant.endsWith('dark') ? 'dark' : 'light',
  })
  await page.route('**/support.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  // Serve the transformed HTML at the board's own URL so relative links and assets resolve.
  const url = `file://${file}`
  await page.route(url, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }))
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
}

/** The rectangles of the manifest's key elements, in CSS px relative to `.root`. */
export async function boardBoxes(page: Page, screen: Screen): Promise<Record<string, { x: number; y: number; w: number; h: number }>> {
  return page.evaluate((boxes) => {
    const root = document.querySelector('.root')!.getBoundingClientRect()
    const out: Record<string, { x: number; y: number; w: number; h: number }> = {}
    for (const [name, selector] of Object.entries(boxes)) {
      const found = document.querySelectorAll(`.root ${selector}`)
      if (found.length !== 1) throw new Error(`box ${name}: "${selector}" matches ${found.length} elements, expected exactly 1`)
      const r = found[0]!.getBoundingClientRect()
      out[name] = { x: r.left - root.left, y: r.top - root.top, w: r.width, h: r.height }
    }
    return out
  }, screen.boxes)
}

export function boardHtml(screen: Screen): string {
  return readFileSync(join(canvasDir, screen.board), 'utf8')
}
