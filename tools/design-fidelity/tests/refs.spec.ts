import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { boardBoxes, openBoard } from '../src/board'
import { comparableScreens, loadManifest, refsDir, type Variant } from '../src/manifest'
import { derivedVariants, prepareVariant } from '../src/variants'

const manifest = loadManifest()

// One reference per comparable screen and manifest variant, rendered from the board only.
for (const screen of comparableScreens(manifest)) {
  for (const variant of derivedVariants(screen.variants)) {
    test(`reference ${screen.id} ${variant}`, async ({ page }) => {
      await openBoard(page, screen, variant as Variant)
      await prepareVariant(page, screen, variant as Variant)
      const root = page.locator('.root')
      const box = await root.boundingBox()
      expect(box, 'the board has a .root').not.toBeNull()
      expect([box!.width, box!.height], `board ${screen.board} must render at its size`).toEqual([screen.w, screen.h])

      const dir = join(refsDir, screen.id)
      mkdirSync(dir, { recursive: true })
      await root.screenshot({ path: join(dir, `${variant}.png`), animations: 'disabled' })
      const boxes = await boardBoxes(page, screen)
      writeFileSync(join(dir, `${variant}.boxes.json`), `${JSON.stringify(boxes, null, 2)}\n`)
    })
  }
}
