import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// FR-043: every text/background token pair meets WCAG AA in both themes.
const css = readFileSync(path.resolve(__dirname, '../../src/app/(site)/globals.css'), 'utf8')

function block(selector: RegExp): Record<string, string> {
  const match = css.match(selector)
  if (!match) throw new Error(`missing block ${selector}`)
  return Object.fromEntries(
    [...match[1]!.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]),
  )
}

function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

const ratio = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1! + 0.05) / (l2! + 0.05)
}

const themes = {
  light: block(/:root \{([\s\S]*?)\n\}/),
  dark: block(/\n\.dark \{([\s\S]*?)\n\}/),
}

const PAIRS: [fg: string, bg: string, min: number][] = [
  ['ink', 'ground', 4.5],
  ['mute', 'ground', 4.5],
  ['ink', 'panel-solid', 4.5],
  ['mute', 'panel-solid', 4.5],
  ['on-accent', 'accent', 4.5],
  // Owner decision 2026-11-10: primary buttons and the Top Hit are red; accent stays for selection.
  ['on-primary', 'primary', 4.5],
  ['on-primary', 'primary-hover', 4.5],
  ['tile-ink', 'tile', 4.5],
  ['on-attention', 'attention', 4.5],
  ['ground', 'ink', 4.5],
  // Design system 2026-11-09 (direction A): accent as text, and the success / danger tints.
  ['accent-ink', 'ground', 4.5],
  ['accent-ink', 'panel-solid', 4.5],
  ['on-success', 'success', 4.5],
  ['on-danger', 'danger', 4.5],
  ['on-danger', 'ground', 4.5],
  ['whatsapp-ink', 'ground', 4.5],
]

describe.each(Object.entries(themes))('%s theme contrast', (_name, tokens) => {
  it.each(PAIRS)('%s on %s ≥ %s:1', (fg, bg, min) => {
    expect(ratio(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min)
  })
})

it('the no-JavaScript dark fallback matches the .dark tokens', () => {
  const media = block(/:root:not\(\.light\) \{([\s\S]*?)\n  \}/)
  expect(media).toEqual(themes.dark)
})

// The glass bar over the hero image is translucent, so its text is checked against the glass
// composited over what can sit behind it: mid grey (a blurred photo's typical average) and the
// worst photo once the theme's scrim is laid on it (black under light glass, white under smoked).
describe('FR-066 glass bar over the hero image', () => {
  const rgba = (value: string): [number[], number] => {
    const m = value.match(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/)
    if (!m) throw new Error(`not an rgb() colour: ${value}`)
    return [[+m[1]!, +m[2]!, +m[3]!], +m[4]!]
  }
  const hex = (rgb: number[]) =>
    `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
  const over = (top: string, under: number[]) => {
    const [rgb, a] = rgba(top)
    return rgb.map((c, i) => a * c + (1 - a) * under[i]!)
  }
  const grey = (v: number) => [v, v, v]

  const glass = {
    light: block(/\n\.bar-glass \{([\s\S]*?)\n\}/),
    dark: block(/\n\.dark \.bar-glass \{([\s\S]*?)\n\}/),
  }
  // Worst photo behind each glass after the photo scrim (white 25 % in light, black 35 % in dark).
  const worst = {
    light: over(themes.light['photo-scrim']!, grey(0)),
    dark: over(themes.dark['photo-scrim']!, grey(255)),
  }

  describe.each(Object.entries(glass))('%s glass', (name, tokens) => {
    const backdrops = { grey: grey(128), worst: worst[name as keyof typeof worst] }
    it.each(Object.entries(backdrops))(
      'text stays ≥ 4.5:1 over a %s backdrop',
      (_backdrop, under) => {
        const panel = over(tokens.panel!, under)
        const tile = over(tokens.tile!, panel)
        expect(ratio(tokens.ink!, hex(panel))).toBeGreaterThanOrEqual(4.5)
        expect(ratio(tokens.mute!, hex(panel))).toBeGreaterThanOrEqual(4.5)
        expect(ratio(tokens['tile-ink']!, hex(tile))).toBeGreaterThanOrEqual(4.5)
      },
    )
  })

  it('the no-JavaScript dark glass matches the .dark glass', () => {
    expect(block(/:root:not\(\.light\) \.bar-glass \{([\s\S]*?)\n  \}/)).toEqual(glass.dark)
  })
})
