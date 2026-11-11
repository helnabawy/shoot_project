// The same font files the Flutter goldens draw with (apps/mobile/test/fonts), injected into every
// board so both sides rasterise the same glyphs (research R7).
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { repoRoot } from './manifest'

export const fontsDir = join(repoRoot, 'apps/mobile/test/fonts')

const WEIGHTS: Record<string, number> = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 }

/** `@font-face` rules for Roboto and Noto Sans Arabic, plus the rule that forces them on the board. */
export function fontCss(dir = fontsDir): string {
  const faces: string[] = []
  for (const file of readdirSync(dir).sort()) {
    const m = file.match(/^(Roboto|NotoSansArabic)-(Regular|Medium|SemiBold|Bold)\.ttf$/)
    if (!m) continue
    const family = m[1] === 'Roboto' ? 'Roboto' : 'Noto Sans Arabic'
    const url = pathToFileURL(join(dir, file)).href
    faces.push(
      `@font-face{font-family:'${family}';src:url('${url}') format('truetype');font-weight:${WEIGHTS[m[2]!]};font-style:normal;font-display:block}`,
    )
  }
  if (faces.length !== 8) throw new Error(`expected 8 test fonts in ${dir}, found ${faces.length}`)
  return `${faces.join('\n')}\n.root,.root *{font-family:Roboto,'Noto Sans Arabic' !important}`
}
