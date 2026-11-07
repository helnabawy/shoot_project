#!/usr/bin/env node
// SC-004 / Principle III: every scenario in a feature's quickstart mapping table has its tests.
// Fails when a test file named in the table is missing, or does not carry the row's id (`CP-…`, `MP-…`) in a
// test or describe name (any two- or three-letter prefix: `CP-`, `MP-`). Usage: node scripts/check-scenario-tests.mjs [specs/002-creator-profiles/quickstart.md]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const quickstart = resolve(root, process.argv[2] ?? 'specs/002-creator-profiles/quickstart.md')
const SEARCH_ROOTS = ['apps/web/src', 'apps/web/tests', 'packages/domain/src', 'scripts'].map((p) => join(root, p))
const SKIP = new Set(['node_modules', '.next', 'coverage', 'test-results', 'playwright-report'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}
const files = SEARCH_ROOTS.filter(existsSync).flatMap((dir) => walk(dir))

/** `domain/creators/x.test.ts`, `modules/creators/summary.test.ts` or a bare file name. */
function resolveFile(ref) {
  if (existsSync(join(root, ref))) return [join(root, ref)]
  const candidates = files.filter((f) => f.endsWith(`/${ref}`) || f.endsWith(`/src/${ref}`) || (ref.startsWith('domain/') && f.endsWith(`/packages/domain/src/${ref.slice(7)}`)))
  return candidates.length ? candidates : files.filter((f) => basename(f) === basename(ref))
}

const text = readFileSync(quickstart, 'utf8')
const section = text.split(/^## Scenario → test mapping.*$/m)[1]?.split(/^## /m)[0] ?? ''
const rows = section.split('\n').filter((l) => l.startsWith('|') && !/^\|[-\s|]+\|$/.test(l) && !l.startsWith('| Id'))
const problems = []
let checked = 0

for (const row of rows) {
  const cells = row.split('|').slice(1, -1).map((c) => c.trim())
  const id = cells[0]?.match(/^[A-Z]{2,3}-[A-Z0-9]+(?:-[A-Za-z0-9]+)*/)?.[0] ?? null
  const refs = [...(cells[2] ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1])
  for (const ref of refs) {
    if (ref.includes('*')) continue // "all cp-*.spec.ts": a pattern, not a file
    checked += 1
    const found = resolveFile(ref)
    if (found.length === 0) {
      problems.push(`missing: ${ref} (row: ${cells[0]?.slice(0, 70)})`)
      continue
    }
    if (!id || !/\.(test|spec)\.tsx?$/.test(ref)) continue
    const named = found.some((f) => readFileSync(f, 'utf8').split('\n').some((line) => line.includes(id) && /\b(it|test|describe)(\.\w+)*\(/.test(line)))
    if (!named) problems.push(`no test named with ${id}: ${ref}`)
  }
}

if (problems.length) {
  console.error(`Scenario → test mapping (${quickstart.replace(`${root}/`, '')}) has ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`scenario tests: ok (${rows.length} rows, ${checked} test files)`)
