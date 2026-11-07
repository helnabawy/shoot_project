export const SOCIAL_PLATFORMS = ['instagram', 'linkedin', 'youtube', 'tiktok', 'x', 'website'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

const PLATFORM_HOSTS: Record<Exclude<SocialPlatform, 'website'>, readonly string[]> = {
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com'],
}

/** The host is the allowed domain itself or a subdomain of it, never a look-alike. */
export function hostMatches(url: URL, hosts: readonly string[]): boolean {
  return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
}

export function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/** https only; a platform link must be on that platform's domain, "website" may be any https host. */
export function isAllowedSocialUrl(platform: SocialPlatform, value: string): boolean {
  const url = parseHttpsUrl(value)
  if (!url) return false
  return platform === 'website' ? true : hostMatches(url, PLATFORM_HOSTS[platform])
}
