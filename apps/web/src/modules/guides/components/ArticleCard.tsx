import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import type { ArticleSummary } from '../queries'

export interface CardLabels {
  availableInEnglish: string
  by: (name: string) => string
}

/** One guide in a list: a quiet row, the title is the link. */
export function ArticleCard({
  article,
  locale,
  date,
  labels,
  eager = false,
}: {
  article: ArticleSummary
  locale: Locale
  /** The publication date, already formatted for the reader. */
  date: string
  labels: CardLabels
  /** The first card's image is loaded at once (it can be the largest paint). */
  eager?: boolean
}) {
  const english = locale !== 'en' && !article.translated
  return (
    <article className="flex gap-4 py-5" data-testid="article-card">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-mute">
          {article.categories[0] ? <span>{article.categories[0].name} · </span> : null}
          <time dateTime={article.publishedAt}>{date}</time>
        </p>
        <h2 className="mt-1 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-ink text-balance">
          <Link
            href={localizeHref(`/guides/${article.slug}`, locale)}
            className="after:absolute after:inset-0 hover:underline focus-visible:underline"
            {...(english ? { lang: 'en', dir: 'ltr' } : {})}
          >
            {article.title}
          </Link>
        </h2>
        <p className="mt-1 text-[15px] text-mute" {...(english ? { lang: 'en', dir: 'ltr' } : {})}>
          {article.summary}
        </p>
        {english ? <p className="mt-2 text-[12px] font-medium text-mute">{labels.availableInEnglish}</p> : null}
      </div>
      {article.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover.url}
          alt={article.cover.alt}
          width={article.cover.width ?? 160}
          height={article.cover.height ?? 120}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes="112px"
          className="hidden h-24 w-28 shrink-0 rounded-md object-cover sm:block"
        />
      ) : null}
    </article>
  )
}
