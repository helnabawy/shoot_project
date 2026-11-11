#!/usr/bin/env node
// Principle III: at least N % of the changed, instrumentable Dart lines are covered by tests.
// Usage: node scripts/check-changed-coverage.mjs <lcov.info> <base-ref> [minPercent=80]
// lcov paths are relative to the Flutter app (lib/…); the diff is taken for apps/mobile/lib.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const [lcovPath, base, minArg] = process.argv.slice(2)
if (!lcovPath || !base) {
  console.error('usage: check-changed-coverage.mjs <lcov.info> <base-ref> [minPercent]')
  process.exit(2)
}
const min = Number(minArg ?? 80)
const root = resolve(new URL('..', import.meta.url).pathname)
const appDir = relative(root, resolve(dirname(lcovPath), '..')) // apps/mobile

// file (repo-relative) -> Map(line -> hits)
const coverage = new Map()
let current = null
for (const line of readFileSync(lcovPath, 'utf8').split('\n')) {
  if (line.startsWith('SF:')) {
    current = new Map()
    coverage.set(join(appDir, line.slice(3)), current)
  } else if (line.startsWith('DA:') && current) {
    const [n, hits] = line.slice(3).split(',')
    current.set(Number(n), Number(hits))
  }
}

const diff = execFileSync('git', ['diff', '-U0', `${base}...HEAD`, '--', `${appDir}/lib`], { cwd: root, encoding: 'utf8' })
let file = null
let changed = 0
let covered = 0
const misses = []
const unloaded = new Set()
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) file = line.startsWith('+++ b/') ? line.slice(6) : null
  const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
  if (!hunk || !file || file.includes('/generated/')) continue
  const start = Number(hunk[1])
  const count = hunk[2] === undefined ? 1 : Number(hunk[2])
  const lines = coverage.get(file)
  if (!lines) {
    // No test loads this file. A Dart file with function bodies then counts as uncovered; an
    // interface-only file (no bodies) has nothing to run, and main.dart is the device-only root.
    if (file.endsWith('.dart') && !file.endsWith('/lib/main.dart')) unloaded.add(file)
    continue
  }
  for (let n = start; n < start + count; n += 1) {
    if (!lines.has(n)) continue // not instrumentable (comment, brace, declaration)
    changed += 1
    if (lines.get(n) > 0) covered += 1
    else misses.push(`${file}:${n}`)
  }
}

for (const f of unloaded) {
  const text = readFileSync(join(root, f), 'utf8')
  if (!/=>|\)\s*(async\s*)?\{\s*$/m.test(text)) continue
  const code = text
    .split('\n')
    .filter((l) => {
      const t = l.trim()
      return t && !t.startsWith('//') && !t.startsWith('import ') && !t.startsWith('export ') && !/^[{}()\[\];,]+$/.test(t)
    }).length
  changed += code
  misses.push(`${f} (not loaded by any test, ${code} lines)`)
}

const pct = changed === 0 ? 100 : (100 * covered) / changed
console.log(`changed-line coverage: ${covered}/${changed} = ${pct.toFixed(1)} % (minimum ${min} %)`)
if (pct < min) {
  console.error('uncovered changed lines:\n  ' + misses.slice(0, 50).join('\n  '))
  process.exit(1)
}
