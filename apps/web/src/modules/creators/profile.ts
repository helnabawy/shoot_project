import { parseHttpsUrl } from '@shoot/domain/creators'
import { joinList, refId, type Ref } from '@shoot/domain/personas'
import type { Media } from '@/payload-types'
import { initialsOf, type Lookups } from './describe'
import { photoOf, type RawProfile } from './summary'

interface RawSample {
  id?: string | null
  kind?: 'image' | 'video' | null
  image?: Media | number | null
  videoUrl?: string | null
  caption?: string | null
  category?: Ref | null
}

/** A published profile as Payload returns it at depth 1 (relations populated, text in one locale). */
export interface RawProfileDoc extends Omit<RawProfile, 'samples'> {
  samples?: RawSample[] | null
  social?: { id?: string | null; platform: string; url: string }[] | null
}

export interface ImageView {
  url: string
  width: number
  height: number
}

export interface SampleView {
  id: string
  kind: 'image' | 'video'
  /** The grid image (the `card` size). */
  thumb: ImageView
  /** The viewer image (the largest size). */
  large: ImageView
  alt: string
  caption: string
  specialty: string
  /** Video samples only: where it plays (a new tab) and on which site. */
  videoUrl?: string
  provider?: string
}

export interface ProfileView {
  id: string
  code: string
  name: string
  initials: string
  bio: string
  photo: ReturnType<typeof photoOf>
  /** "Photographer and videographer". */
  types: string
  places: string[]
  specialties: string[]
  languages: string[]
  samples: SampleView[]
  social: { platform: string; url: string }[]
  /** The image shared with the link: the first sample (the work), else the photo. */
  shareImage: ImageView | null
}

export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale === 'ar' ? 'ar' : 'en'], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

/** "YouTube", "Vimeo", or the bare host; empty when the link is not a URL. */
export function hostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'YouTube'
    if (host.endsWith('vimeo.com')) return 'Vimeo'
    return host
  } catch {
    return ''
  }
}

const sized = (media: Media, names: ('hero' | 'card' | 'thumbnail')[]): ImageView | null => {
  for (const name of names) {
    const size = media.sizes?.[name]
    if (size?.url && size.width && size.height) return { url: size.url, width: size.width, height: size.height }
  }
  return media.url && media.width && media.height ? { url: media.url, width: media.width, height: media.height } : null
}

const names = (ids: readonly Ref[] | null | undefined, map: ReadonlyMap<string, string>) =>
  (ids ?? []).map((id) => map.get(refId(id))).filter((n): n is string => Boolean(n))

function sampleView(raw: RawSample, index: number, lookups: Lookups): SampleView | null {
  const image = raw.image && typeof raw.image === 'object' ? raw.image : null
  const thumb = image ? sized(image, ['card', 'thumbnail']) : null
  const large = image ? sized(image, ['hero', 'card']) : null
  if (!image || !thumb || !large) return null
  const video = raw.kind === 'video'
  if (video && !raw.videoUrl) return null
  return {
    id: raw.id ?? String(index),
    kind: video ? 'video' : 'image',
    thumb,
    large,
    alt: image.alt ?? '',
    caption: raw.caption ?? '',
    specialty: raw.category ? (lookups.specialties.get(refId(raw.category)) ?? '') : '',
    ...(video ? { videoUrl: raw.videoUrl as string, provider: hostLabel(raw.videoUrl as string) } : {}),
  }
}

/** Everything the profile page shows, resolved for one language; bad rows are dropped, never rendered half-empty. */
export function buildProfileView(doc: RawProfileDoc, lookups: Lookups, locale: string): ProfileView {
  const name = doc.displayName ?? ''
  const samples = (doc.samples ?? []).map((s, i) => sampleView(s, i, lookups)).filter((s): s is SampleView => s !== null)
  const photo = doc.photo && typeof doc.photo === 'object' ? doc.photo : null
  return {
    id: String(doc.id),
    code: doc.code ?? '',
    name,
    initials: initialsOf(name),
    bio: doc.bio ?? '',
    photo: photoOf(doc.photo),
    types: joinList(names(doc.personas, lookups.personas), 'and', locale),
    places: names(doc.cities, lookups.locations),
    specialties: names(doc.specialties, lookups.specialties),
    languages: (doc.languages ?? []).map((code) => languageName(code, locale)),
    samples,
    social: (doc.social ?? []).filter((s) => parseHttpsUrl(s.url)).map((s) => ({ platform: s.platform, url: s.url })),
    shareImage: samples[0]?.large ?? (photo ? sized(photo, ['hero', 'card']) : null),
  }
}
