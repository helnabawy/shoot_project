import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PlayIcon } from '@/shared/ui/icons'
import type { SampleView } from '../profile'

/**
 * The portfolio as a grid on the ground: two columns on phones, three from 640 px, and two large columns
 * from 1024 px where the work fills the profile's wide end column; a uniform 4:5 crop,
 * no captions, no hover zoom. Image links point at the large file (they work without JavaScript; the
 * viewer enhances them); video samples open on their own site in a new tab.
 */
export function SampleGallery({ samples }: { samples: SampleView[] }) {
  const t = useTranslations('creators.profile')
  // Position of each image among the images only (videos are not in the viewer).
  const imageIndexes = samples.map((_, i) => samples.slice(0, i).filter((s) => s.kind === 'image').length)
  return (
    <ul data-testid="sample-gallery" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 lg:gap-3">
      {samples.map((sample, i) => {
        const picture = (
          <Image
            src={sample.thumb.url}
            alt={sample.alt}
            width={sample.thumb.width}
            height={sample.thumb.height}
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 220px, 46vw"
            loading="lazy"
            className="aspect-[4/5] w-full object-cover"
          />
        )
        if (sample.kind === 'video') {
          return (
            <li key={sample.id} data-testid={`sample-${i}`}>
              <a
                href={sample.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('watchOn', { provider: sample.provider ?? '' })}: ${sample.caption || sample.alt}`}
                className="relative block overflow-hidden rounded-[var(--radius-tile)] bg-tile"
              >
                {picture}
                <span aria-hidden="true" className="absolute end-2 bottom-2 grid size-8 place-items-center rounded-[var(--radius-tile)] bg-ink text-ground">
                  <PlayIcon width={16} height={16} />
                </span>
              </a>
              <span className="mt-1 block text-[13px] text-mute">{sample.provider}</span>
            </li>
          )
        }
        return (
          <li key={sample.id} data-testid={`sample-${i}`}>
            <a
              href={sample.large.url}
              data-sample-index={imageIndexes[i]}
              aria-label={sample.caption || sample.alt}
              className="block overflow-hidden rounded-[var(--radius-tile)] bg-tile"
            >
              {picture}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
