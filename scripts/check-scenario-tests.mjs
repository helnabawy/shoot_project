#!/usr/bin/env node
// SC-004 / Principle III: every scenario in a feature's quickstart mapping table has its tests.
// Fails when a test file named in the table is missing, or does not carry the row's id (`CP-…`, `MP-…`, `QM-…`)
// in a test or describe name (any two- or three-letter prefix); Dart tests under apps/mobile/test count when the id is in the string
// of a `test(`, `testWidgets(`, `group(` or `blocTest(` call. Usage: node scripts/check-scenario-tests.mjs [specs/NNN-name/quickstart.md …]
// With no argument, every specs/*/quickstart.md that has a mapping table is checked.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const MAPPING = /^## Scenario → test mapping.*$/m
const specsDir = join(root, 'specs')
const quickstarts = process.argv.length > 2
  ? process.argv.slice(2).map((p) => resolve(root, p))
  : readdirSync(specsDir)
      .map((d) => join(specsDir, d, 'quickstart.md'))
      // Tables whose rows carry a feature prefix (`CP-`, `QM-`); 001's unprefixed table predates the check.
      .filter((f) => existsSync(f) && /^\| [A-Z]{2,3}-(?:US|FR|SC)/m.test(readFileSync(f, 'utf8').split(MAPPING)[1] ?? ''))
const SEARCH_ROOTS = ['apps/web/src', 'apps/web/tests', 'apps/mobile/test', 'packages/domain/src', 'scripts'].map((p) => join(root, p))
const SKIP = new Set(['node_modules', '.next', 'coverage', 'test-results', 'playwright-report', '.dart_tool', 'build'])

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

const problems = []
let checked = 0
let totalRows = 0

for (const quickstart of quickstarts) {
  const label = quickstart.replace(`${root}/`, '')
  const text = readFileSync(quickstart, 'utf8')
  const section = text.split(MAPPING)[1]?.split(/^## /m)[0] ?? ''
  const rows = section.split('\n').filter((l) => l.startsWith('|') && !/^\|[-\s|]+\|$/.test(l) && !l.startsWith('| Id'))

  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map((c) => c.trim())
    const id = cells[0]?.match(/^[A-Z]{2,3}-[A-Z0-9]+(?:-[A-Za-z0-9]+)*/)?.[0] ?? null
    const refs = [...(cells[2] ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1])
    for (const ref of refs) {
      if (ref.includes('*')) continue // "all cp-*.spec.ts": a pattern, not a file
      checked += 1
      const found = resolveFile(ref)
      if (found.length === 0) {
        problems.push(`${label}: missing: ${ref} (row: ${cells[0]?.slice(0, 70)})`)
        continue
      }
      const isDart = /_test\.dart$/.test(ref)
      if (!id || !(isDart || /\.(test|spec)\.tsx?$/.test(ref))) continue
      // Dart: the id sits in the first string of the call, which `dart format` may move to the next line.
      const dartNamed = new RegExp(`\\b(?:test|testWidgets|group|blocTest)(?:<[^(]*>)?\\(\\s*(['"])[^'"\\n]*${id}`)
      const named = found.some((f) => {
        const text = readFileSync(f, 'utf8')
        return isDart ? dartNamed.test(text) : text.split('\n').some((line) => line.includes(id) && /\b(it|test|describe)(\.\w+)*\(/.test(line))
      })
      if (!named) problems.push(`${label}: no test named with ${id}: ${ref}`)
    }
  }
  totalRows += rows.length
}

if (problems.length) {
  console.error(`Scenario → test mapping has ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`scenario tests: ok (${quickstarts.length} tables, ${totalRows} rows, ${checked} test files)`)
