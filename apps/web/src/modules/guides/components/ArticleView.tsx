import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { RichContent } from '@/shared/ui/RichContent'
import type { ArticleDetail, ArticleSummary } from '../queries'
import { ArticleCard } from './ArticleCard'

/** A guide: author line, cover, text, related guides, and the two ways to go on (brief, WhatsApp). */
export async function ArticleView({ article, related, locale, contact, english }: { article: ArticleDetail; related: ArticleSummary[]; locale: Locale; contact: ContactDetails; english: boolean }) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: 'guides' }), getFormatter({ locale })])
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'long', timeZone: 'Asia/Dubai' })
  const textAttrs = english ? { lang: 'en', dir: 'ltr' as const } : {}
  return (
    <article className="mx-auto max-w-[680px] px-4 pt-10 sm:pt-14" data-testid="article-view">
      <header>
        {article.categories.length ? (
          <p className="text-[13px] text-mute">
            {article.categories.map((c, i) => (
              <span key={c.slug}>
                {i > 0 ? ' · ' : null}
                <Link href={localizeHref(`/guides/category/${c.slug}`, locale)} className="hover:underline">
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance" {...textAttrs}>
          {article.title}
        </h1>
        <p className="mt-3 text-[15px] text-mute" {...textAttrs}>
          {article.summary}
        </p>
        <p className="mt-3 text-[14px] text-mute">
          {article.author ? (
            <>
              <Link href={localizeHref(`/guides/author/${article.author.slug}`, locale)} className="font-medium text-ink hover:underline">
                {t('by', { name: article.author.name })}
              </Link>
              {' · '}
            </>
          ) : null}
          <time dateTime={article.publishedAt}>{date(article.publishedAt)}</time>
          {' · '}
          {t('readingTime', { minutes: article.readingMinutes })}
        </p>
        {english ? <p className="mt-2 text-[12px] font-medium text-mute">{t('availableInEnglish')}</p> : null}
      </header>
      {article.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover.url}
          alt={article.cover.alt}
          width={article.cover.width ?? 1200}
          height={article.cover.height ?? 630}
          fetchPriority="high"
          decoding="async"
          sizes="(min-width: 720px) 680px, 100vw"
          className="mt-6 h-auto w-full rounded-lg"
        />
      ) : null}
      <div className="mt-8" {...textAttrs}>
        <RichContent data={article.body as never} locale={locale} />
      </div>
      <aside className="mt-12 rounded-lg border border-hair p-4" aria-labelledby="guide-next">
        <h2 id="guide-next" className="text-[18px] font-semibold text-ink">
          {t('ctaTitle')}
        </h2>
        <p className="mt-1 text-[15px] text-mute">{t('ctaBody')}</p>
        <div className="mt-3">
          <CtaLink cta={{ label: t('ctaBrief'), kind: 'link', href: '/' }} contact={contact} locale={locale} />
          <CtaLink cta={{ label: t('ctaWhatsApp'), kind: 'whatsapp' }} contact={contact} locale={locale} variant="secondary" />
        </div>
      </aside>
      {related.length ? (
        <section className="mt-12" aria-labelledby="guide-related">
          <h2 id="guide-related" className="text-[18px] font-semibold text-ink">
            {t('related')}
          </h2>
          <div className="relative divide-y divide-hair">
            {related.map((r) => (
              <div key={r.id} className="relative">
                <ArticleCard
                  article={r}
                  locale={locale}
                  date={date(r.publishedAt)}
                  labels={{ availableInEnglish: t('availableInEnglish'), by: (name) => t('by', { name }) }}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}
