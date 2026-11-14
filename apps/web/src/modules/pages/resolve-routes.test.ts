import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { classifyPath } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'

const SITE = join(import.meta.dirname, '../../app/(site)/[locale]')

/** Routes under `[locale]` that are not app places. */
const NOT_APP_PLACES = new Set(['guides/feed'])

/** Every `page.tsx` folder under the site, relative, e.g. `creators/[code]`. */
function pageRoutes(dir = SITE): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...pageRoutes(full))
    else if (name === 'page.tsx') out.push(relative(SITE, dir))
  }
  return out.sort()
}

/** A concrete address for a route folder: `[x]` becomes a sample value, `[[...rest]]` is dropped. */
const sample = (route: string): string =>
  `/${route
    .split('/')
    .filter((s) => s.length > 0 && !s.startsWith('[['))
    .map((s) => (s.startsWith('[') ? 'sample-1' : s))
    .join('/')}`.replace(/\/$/, '') || '/'

describe('MR-US5-S1 every website page route maps to a resolver pattern (drift)', () => {
  const routes = pageRoutes().filter((r) => !NOT_APP_PLACES.has(r))

  it('finds the site routes', () => {
    expect(routes).toEqual(expect.arrayContaining(['', 'creators/[code]', 'match/[ref]/[key]/details', 'terms/[[...rest]]']))
  })

  it.each(routes.map((r) => [r || '(home)', sample(r)]))('%s (%s) is classified', (_route, path) => {
    expect(classifyPath(path), path).not.toBeNull()
  })
})
