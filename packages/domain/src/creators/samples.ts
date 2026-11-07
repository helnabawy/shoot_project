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
