import Image from 'next/image'
import type { Media } from '@/payload-types'
import { cx } from '@/shared/ui/bar'

type Size = 'thumbnail' | 'card' | 'hero'

/** The file to serve for a media item at a size, falling back to the original. */
export function mediaSource(media: Media, size: Size) {
  const variant = media.sizes?.[size]
  if (variant?.url && variant.width && variant.height) return { url: variant.url, width: variant.width, height: variant.height }
  if (media.url && media.width && media.height) return { url: media.url, width: media.width, height: media.height }
  return null
}

/**
 * A CMS image at the right size with its alt text. With a dark variant, both render and CSS
 * shows the one that matches the theme, so the swap costs no JavaScript (FR-043).
 */
export function CmsImage({
  media,
  dark,
  size = 'card',
  sizes = '(max-width: 768px) 100vw, 680px',
  priority,
  className,
}: {
  media: Media | number | null | undefined
  dark?: Media | number | null
  size?: Size
  sizes?: string
  priority?: boolean
  className?: string
}) {
  if (!media || typeof media !== 'object') return null
  const light = mediaSource(media, size)
  if (!light) return null
  const darkMedia = dark && typeof dark === 'object' ? dark : null
  const darkSource = darkMedia ? mediaSource(darkMedia, size) : null
  return (
    <>
      <Image
        src={light.url}
        width={light.width}
        height={light.height}
        alt={media.alt ?? ''}
        sizes={sizes}
        priority={priority}
        className={cx(className, darkSource && 'dark:hidden')}
      />
      {darkSource && darkMedia ? (
        <Image
          src={darkSource.url}
          width={darkSource.width}
          height={darkSource.height}
          alt={darkMedia.alt ?? media.alt ?? ''}
          sizes={sizes}
          className={cx(className, 'hidden dark:block')}
        />
      ) : null}
    </>
  )
}
