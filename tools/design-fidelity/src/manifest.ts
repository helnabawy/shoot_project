// Reads and validates specs/design-system/canvas/manifest.json (contracts/manifest.md).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const repoRoot = resolve(toolRoot, '../..')
export const canvasDir = join(repoRoot, 'specs/design-system/canvas')
export const goldensDir = join(repoRoot, 'apps/mobile/test/goldens/screens/goldens')
export const refsDir = join(toolRoot, 'build/refs')

export const VARIANTS = ['en-light', 'en-dark', 'ar-light', 'ar-dark'] as const
export type Variant = (typeof VARIANTS)[number]

export interface Screen {
  id: string
  title: string
  board: string
  w: number
  h: number
  target: 'mobile' | 'web'
  feature: string | null
  variants: Variant[]
  boxes: Record<string, string>
  threshold?: number
  reason?: string
  variantOf?: string
  sha256: string
  changedSinceLastExport?: boolean
}

export interface Manifest {
  canvas: { title: string; url: string; version: string; exportedAt: string }
  designSystem: { title: string; url: string; version: string }
  defaults: { scale: number; threshold: number; geometryTolerancePx: number; reducedMotion: boolean }
  screens: Screen[]
}

export class ManifestError extends Error {
  override name = 'ManifestError'
}

/** Throws a ManifestError naming the screen for any rule in contracts/manifest.md that fails. */
export function validateManifest(manifest: Manifest, dir = canvasDir): Manifest {
  const ids = new Set<string>()
  for (const s of manifest.screens) {
    const where = `screen ${s.id} (${s.board})`
    if (ids.has(s.id)) throw new ManifestError(`${where}: duplicate id`)
    ids.add(s.id)
    if (s.threshold !== undefined && !s.reason?.trim()) {
      throw new ManifestError(`${where}: threshold ${s.threshold} has no reason; an override needs a written reason`)
    }
    if (!existsSync(join(dir, s.board))) throw new ManifestError(`${where}: board file is missing`)
    if (!(s.w > 0 && s.h > 0)) throw new ManifestError(`${where}: w and h must be positive`)
    for (const v of s.variants) {
      if (!VARIANTS.includes(v)) throw new ManifestError(`${where}: unknown variant ${v}`)
    }
  }
  for (const s of manifest.screens) {
    if (s.variantOf !== undefined && !ids.has(s.variantOf)) {
      throw new ManifestError(`screen ${s.id} (${s.board}): variantOf ${s.variantOf} is not a screen`)
    }
  }
  return manifest
}

export function loadManifest(path = join(canvasDir, 'manifest.json')): Manifest {
  return validateManifest(JSON.parse(readFileSync(path, 'utf8')) as Manifest, dirname(path))
}

/** Features whose screens are gated; each screen feature adds itself when it ships. */
export function shippedFeatures(path = join(toolRoot, 'shipped.json')): Set<string> {
  return new Set(JSON.parse(readFileSync(path, 'utf8')) as string[])
}

const isBuildable = (s: Screen) => s.target === 'mobile' && s.feature !== null && s.variantOf === undefined

/** Screens compared against their boards: mobile, owned by a shipped feature, not a designer variant. */
export function comparableScreens(manifest: Manifest, shipped = shippedFeatures()): Screen[] {
  return manifest.screens.filter((s) => isBuildable(s) && shipped.has(s.feature as string))
}

/** Mobile screens skipped because their feature has not shipped yet (listed in the report). */
export function skippedScreens(manifest: Manifest, shipped = shippedFeatures()): Screen[] {
  return manifest.screens.filter((s) => isBuildable(s) && !shipped.has(s.feature as string))
}

/** Boards changed since the last export: their goldens are stale until they pass again. */
export function needsReview(manifest: Manifest): Screen[] {
  return manifest.screens.filter((s) => s.changedSinceLastExport === true)
}

/** Screens with their own threshold, with the reason (listed in the report header). */
export function overrides(manifest: Manifest): Screen[] {
  return manifest.screens.filter((s) => s.threshold !== undefined)
}

export function thresholdOf(manifest: Manifest, screen: Screen): number {
  return screen.threshold ?? manifest.defaults.threshold
}

/** Designer-made variants (42, 43) that validate the derived references. */
export function designerVariants(manifest: Manifest): Screen[] {
  return manifest.screens.filter((s) => s.variantOf !== undefined)
}

export function screenById(manifest: Manifest, id: string): Screen {
  const s = manifest.screens.find((x) => x.id === id)
  if (!s) throw new ManifestError(`screen ${id} is not in the manifest`)
  return s
}
