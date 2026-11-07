import { MAX_SAMPLES } from './limits'
import { hostMatches, parseHttpsUrl } from './links'

/** Video samples are links, never embeds (research §7). */
export const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com'] as const

export function isAllowedVideoUrl(value: string): boolean {
  const url = parseHttpsUrl(value)
  return url !== null && hostMatches(url, VIDEO_HOSTS)
}

export function canAddSample(currentCount: number): boolean {
  return currentCount < MAX_SAMPLES
}

/** What a specialty page says about its work, from the public creators only. */
export interface SpecialtyCounts {
  samples: number
  pros: number
}

/** Samples shown on one specialty page (research §14). */
export const MAX_SPECIALTY_SAMPLES = 24

/**
 * Real counts per specialty id from the listed creators: `pros` are those who offer the specialty,
 * `samples` the rows filed under it by them. A specialty nobody offers is absent, so a page never
 * prints a zero it did not earn (Principle IX). A row under a specialty the creator does not list
 * is not counted: the profile rules keep those from existing, and they are never shown.
 */
export function specialtyCounts(creators: readonly { specialtyIds: readonly string[]; sampleCounts: Readonly<Record<string, number>> }[]): Record<string, SpecialtyCounts> {
  const counts: Record<string, SpecialtyCounts> = {}
  for (const creator of creators) {
    for (const id of new Set(creator.specialtyIds)) {
      const entry = (counts[id] ??= { samples: 0, pros: 0 })
      entry.pros += 1
      entry.samples += creator.sampleCounts[id] ?? 0
    }
  }
  return counts
}

/**
 * The samples a specialty page shows: newest creators first, one sample per creator before a second
 * from the same creator (so one prolific creator cannot fill the strip), up to `limit`.
 */
export function pickSpecialtySamples<S>(
  creators: readonly { id: string; publishedAt: string; samples: readonly S[] }[],
  limit: number = MAX_SPECIALTY_SAMPLES,
): { creatorId: string; sample: S }[] {
  const ordered = creators
    .filter((c) => c.samples.length > 0)
    .sort((a, b) => (a.publishedAt === b.publishedAt ? a.id.localeCompare(b.id) : a.publishedAt < b.publishedAt ? 1 : -1))
  const picked: { creatorId: string; sample: S }[] = []
  for (let round = 0; picked.length < limit; round += 1) {
    let any = false
    for (const creator of ordered) {
      const sample = creator.samples[round]
      if (sample === undefined) continue
      any = true
      if (picked.length >= limit) break
      picked.push({ creatorId: creator.id, sample })
    }
    if (!any) break
  }
  return picked
}
