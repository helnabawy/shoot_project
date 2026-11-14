import { expect, test } from '@playwright/test'
import { openBoard } from '../src/board'
import { comparableScreens, loadManifest } from '../src/manifest'
import { pixelDiff } from '../src/review'
import { TokeniseError, tokenise } from '../src/tokenise'

const manifest = loadManifest()

test.describe('derivation', () => {
  // Every shipped screen: tokenising must not change a single pixel in light. Boards of features not
  // shipped yet are reported below until their colours have roles (each feature closes its gaps).
  for (const screen of comparableScreens(manifest)) {
    test(`MF-US2-S1 the tokenised English light render of ${screen.id} is identical to the raw board`, async ({ page }) => {
      await openBoard(page, screen, 'en-light')
      const raw = await page.locator('.root').screenshot({ animations: 'disabled' })
      await tokenise(page, screen, false)
      const tokenised = await page.locator('.root').screenshot({ animations: 'disabled' })
      const diff = await pixelDiff(await page.context().newPage(), raw, tokenised, 0)
      expect(diff.diffPixels, `${screen.id}: tokenising changed ${diff.diffPixels} px`).toBe(0)
    })
  }

  test('readiness: colours without a role on boards whose feature has not shipped', async ({ page }, testInfo) => {
    const shipped = new Set(comparableScreens(manifest).map((s) => s.id))
    const gaps: string[] = []
    for (const screen of manifest.screens.filter((s) => s.target === 'mobile' && !s.variantOf && !shipped.has(s.id))) {
      await openBoard(page, screen, 'en-light')
      await tokenise(page, screen, false).catch((e: Error) => gaps.push(e.message))
    }
    await testInfo.attach('unmapped-colours.txt', { body: gaps.join('\n\n') || 'none', contentType: 'text/plain' })
    testInfo.annotations.push({ type: 'readiness', description: `${gaps.length} boards still have colours without a role` })
  })

  test('MF-US2-S4 an unmapped board colour fails the derivation with its name', async ({ page }) => {
    const screen = manifest.screens.find((s) => s.id === '21')!
    await openBoard(page, screen, 'en-dark', [(html) => html.replace('</style>', '.h1{color:#123456}</style>')])
    const error = await tokenise(page, screen, true).then(
      () => null,
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(TokeniseError)
    const message = (error as Error).message
    expect(message).toContain('S09b-signin-code.dc.html')
    expect(message).toMatch(/\.h1 \{ color \}: rgb\(18, 52, 86\) has no role/)
  })

  // Waits for the designer's Arabic dark boards 42 and 43 (research R6, T035 in
  // specs/007-mobile-foundation/tasks.md). Marked fixme so the scenario stays visible and open.
  test.fixme('MF-US2-S2 derived Arabic dark of 21 and 13 match boards 42 and 43', async () => {})
})
