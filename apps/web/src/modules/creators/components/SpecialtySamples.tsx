import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { SpecialtySample } from '../queries'

export type SpecialtySampleItem = Omit<SpecialtySample, 'code' | 'creatorId'> & { href: string }

/**
 * Up to 24 samples of the specialty as a grid on the ground (two columns on phones, three from 640 px,
 * a uniform 4:5 crop, no captions or hover zoom), all lazy: the strip sits below the rows. Each tile opens the profile of who shot it, so the
 * work always leads to a person (surface brief creators-directory). Renders nothing without samples.
 */
export function SpecialtySamples({ samples }: { samples: SpecialtySampleItem[] }) {
  const t = useTranslations('creators.specialty')
  if (samples.length === 0) return null
  return (
    <section aria-labelledby="specialty-samples-title" className="mt-12" data-testid="specialty-samples">
      <h2 id="specialty-samples-title" className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink text-balance sm:text-[30px]">
        {t('samplesTitle')}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {samples.map((sample, i) => (
          <li key={sample.id}>
            <Link
              href={sample.href}
              aria-label={t('sampleBy', { caption: sample.caption || sample.alt, name: sample.creatorName })}
              data-testid={`specialty-sample-${i}`}
              className="block overflow-hidden rounded-[var(--radius-tile)] bg-tile focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
            >
              <Image src={sample.thumb.url} alt="" width={sample.thumb.width} height={sample.thumb.height} sizes="(min-width: 640px) 220px, 46vw" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
