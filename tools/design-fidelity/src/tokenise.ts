// Swaps every hard-coded colour a board draws with for `var(--role)` from tokens.css, so the dark
// reference is the same board with `class="dark"` (research R5). Runs on the live CSSOM after the
// board loads: only rules that style an element are rewritten, and an unmapped colour throws with
// its board, selector, property and value (MF-US2-S4). Proof: en-light is pixel-identical (MF-US2-S1).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { toolRoot, type Screen } from './manifest'
import { rolesByValue, tokensCss } from './tokens'

/** `"<colour key>|<property>": "<role>"` for values the property heuristic gets wrong. */
export function tokeniseOverrides(): Record<string, string> {
  return JSON.parse(readFileSync(join(toolRoot, 'tokenise.overrides.json'), 'utf8')) as Record<string, string>
}

export class TokeniseError extends Error {
  override name = 'TokeniseError'
}

export async function tokenise(page: Page, screen: Screen, dark: boolean): Promise<void> {
  const problems = await page.evaluate(
    ({ roles, overrides, css, dark }) => {
      const key = (r: number, g: number, b: number, a: number) => `${r},${g},${b},${Number(a.toFixed(3))}`
      const colourRe = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g
      const prefer: [RegExp, RegExp][] = [
        [/^(color|caret-color|-webkit-text-fill-color|text-decoration-color|stroke)$/, /(^ink$|-ink$|^on-|^mute$)/],
        [/^(outline|outline-color|box-shadow|border|border-[a-z-]+)$/, /^(focus|hair|control-border)$/],
        [/./, /^(?!on-)(?!.*-ink$)(?!ink$)(?!focus$)/],
      ]
      const pick = (k: string, prop: string): string | null => {
        const o = overrides[`${k}|${prop}`] ?? overrides[`${k}|*`]
        if (o) return o
        const cands = roles[k]
        if (!cands?.length) return null
        if (cands.length === 1) return cands[0]!
        for (const [props, want] of prefer) {
          if (!props.test(prop)) continue
          const hit = cands.find((c) => want.test(c))
          if (hit) return hit
        }
        return cands[0]!
      }
      const problems: string[] = []
      const rewrite = (value: string, prop: string, where: string): string =>
        value.replace(colourRe, (whole, r, g, b, a) => {
          const alpha = a === undefined ? 1 : Number(a)
          // A fully transparent stop: same pixels as `transparent` (gradients interpolate premultiplied).
          if (alpha === 0) return 'transparent'
          const role = pick(key(Number(r), Number(g), Number(b), alpha), prop)
          if (!role) {
            problems.push(`${where} { ${prop} }: ${whole} has no role in tokens.css`)
            return whole
          }
          return `var(--${role})`
        })
      const rewriteStyle = (style: CSSStyleDeclaration, where: string) => {
        for (const prop of Array.from(style)) {
          const value = style.getPropertyValue(prop)
          if (!/rgba?\(/.test(value)) continue
          const next = rewrite(value, prop, where)
          if (next !== value) style.setProperty(prop, next, style.getPropertyPriority(prop))
        }
      }
      const used = (selector: string) => {
        const plain = selector
          .split(',')
          .map((s) => s.replace(/::?(before|after|hover|focus-visible|focus|active|visited|placeholder)\b/g, '').trim() || '*')
        try {
          return plain.some((s) => document.querySelector(s) !== null)
        } catch {
          return true
        }
      }
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule) {
            if (used(rule.selectorText)) rewriteStyle(rule.style, rule.selectorText)
          } else if ('cssRules' in rule) {
            walk((rule as CSSGroupingRule).cssRules)
          }
        }
      }
      for (const sheet of Array.from(document.styleSheets)) {
        const owner = sheet.ownerNode as HTMLElement | null
        if (owner?.dataset?.fidelity !== undefined) continue // our injected styles
        walk(sheet.cssRules)
      }
      for (const el of Array.from(document.querySelectorAll<HTMLElement | SVGElement>('.root, .root *'))) {
        const tag = el.tagName.toLowerCase() + (el.getAttribute('class') ? `.${el.getAttribute('class')!.trim().split(/\s+/).join('.')}` : '')
        if (el.getAttribute('style')) rewriteStyle(el.style, `${tag}[style]`)
        for (const attr of ['stroke', 'fill', 'stop-color', 'color']) {
          const v = el.getAttribute(attr)
          if (!v || /^(none|currentcolor|transparent)$/i.test(v)) continue
          const probe = document.createElement('i')
          probe.style.color = v
          const rgb = probe.style.color // normalised to rgb()/rgba()
          if (!/rgba?\(/.test(rgb)) continue
          const next = rewrite(rgb, attr === 'color' ? 'color' : 'stroke', `${tag}[${attr}]`)
          if (next !== rgb) {
            el.removeAttribute(attr)
            el.style.setProperty(attr === 'color' ? 'color' : attr, next)
          }
        }
      }
      const style = document.createElement('style')
      style.dataset.fidelity = 'tokens'
      style.textContent = css
      document.head.appendChild(style)
      if (dark) document.querySelector('.root')!.classList.add('dark')
      return problems
    },
    { roles: rolesByValue(), overrides: tokeniseOverrides(), css: tokensCss(), dark },
  )
  if (problems.length) {
    throw new TokeniseError(`board ${screen.board} (screen ${screen.id}): ${problems.length} unmapped colour(s):\n  ${problems.join('\n  ')}`)
  }
}
