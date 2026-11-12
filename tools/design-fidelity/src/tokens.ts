// The colour roles of specs/design-system/tokens.css, keyed by normalised value (research R5).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './manifest'

export const tokensPath = join(repoRoot, 'specs/design-system/tokens.css')

/** "r,g,b,a" with alpha to 3 decimals: the key both sides normalise to. */
export function colourKey(value: string): string | null {
  const v = value.trim().toLowerCase()
  let m = /^#([0-9a-f]{3})$/.exec(v)
  if (m) {
    const [r, g, b] = [...m[1]!].map((c) => parseInt(c + c, 16))
    return `${r},${g},${b},1`
  }
  m = /^#([0-9a-f]{6})$/.exec(v)
  if (m) {
    const n = parseInt(m[1]!, 16)
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},1`
  }
  const f = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v)
  if (f) return `${f[1]},${f[2]},${f[3]},${Number(Number(f[4] ?? 1).toFixed(3))}`
  return null
}

/** Light-theme colour roles by value (several roles can share a value), aliases excluded. */
export function rolesByValue(css = readFileSync(tokensPath, 'utf8')): Record<string, string[]> {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark,'))
  const out: Record<string, string[]> = {}
  for (const m of root.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const key = colourKey(m[2]!)
    if (!key) continue
    ;(out[key] ??= []).push(m[1]!)
  }
  return out
}

/**
 * A shadow's key: its colour key and its lengths in px, wherever the colour sits, so
 * `0 1px 2px rgba(0,0,0,.06)` and `rgba(0, 0, 0, 0.06) 0px 1px 2px` match. One shadow only.
 */
export function shadowKey(value: string): string | null {
  const colour = /rgba?\([^)]*\)|#[0-9a-f]{3,6}\b/i.exec(value)
  if (!colour || value.includes(',') && value.replace(/rgba?\([^)]*\)/gi, '').includes(',')) return null
  const key = colourKey(colour[0])
  if (!key) return null
  const lengths = value
    .replace(colour[0], ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((l) => Number.parseFloat(l))
  if (lengths.some(Number.isNaN)) return null
  return `${key}|${lengths.join(' ')}`
}

/** Light-theme shadow roles (`--shadow`, `--shadow-panel`, `--shadow-sheet`) by [shadowKey]. */
export function shadowsByValue(css = readFileSync(tokensPath, 'utf8')): Record<string, string> {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark,'))
  const out: Record<string, string> = {}
  for (const m of root.matchAll(/--(shadow[a-z-]*):\s*([^;]+);/g)) {
    const key = shadowKey(m[2]!)
    if (key) out[key] ??= m[1]!
  }
  return out
}

/** tokens.css without the Tailwind `@theme` block, ready to inject into a board. */
export function tokensCss(css = readFileSync(tokensPath, 'utf8')): string {
  const at = css.indexOf('@theme inline')
  return at === -1 ? css : css.slice(0, at)
}
