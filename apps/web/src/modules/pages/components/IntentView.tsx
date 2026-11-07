import { getTranslations } from 'next-intl/server'
import { BriefBuilder } from '@/modules/brief/components/BriefBuilder'
import type { BriefLabels } from '@/modules/brief/labels'
import type { BriefBuilderConfig } from '@/modules/brief/types'
import { CreatorList, type CreatorListItem } from '@/modules/creators/components/CreatorList'
import { RenderBlocks, type BlockContext } from '@/modules/landing'
import type { Page } from '@/payload-types'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { RichContent } from '@/shared/ui/RichContent'

export interface IntentViewProps {
  page: Page
  locale: Locale
  builder: BriefBuilderConfig | null
  preset: Record<string, string>
  labels: BriefLabels
  creators: CreatorListItem[]
  creatorTotal: number
  faq: { question: string; answer: unknown }[]
  context: BlockContext
  whatsappHref: string
  sourcePath: string
}

/**
 * An intent page: the brief is the page. It starts with the answers the page is about (still changeable),
 * then who can do it, the questions people ask and the editor's sections. Nothing is shown that is not real.
 */
export async function IntentView({ page, locale, builder, preset, labels, creators, creatorTotal, faq, context, whatsappHref, sourcePath }: IntentViewProps) {
  const t = await getTranslations({ locale, namespace: 'intent' })
  const intro = page.intent?.intro
  return (
    <article data-testid="intent-view">
      <section className="mx-auto max-w-[680px] px-3 pt-8 sm:pt-14">
        <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{page.title}</h1>
        {intro ? <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{intro}</p> : <div className="mb-5" />}
        {builder ? (
          <div data-floating-hide>
            <BriefBuilder config={builder} preset={preset} whatsappHref={whatsappHref} providerHref={localizeHref('/register?type=provider', locale)} sourcePath={sourcePath} labels={labels} />
          </div>
        ) : null}
      </section>
      {creators.length ? (
        <section className="mx-auto mt-12 max-w-[680px] px-4" aria-labelledby="intent-creators">
          <h2 id="intent-creators" className="text-[20px] font-semibold text-ink">
            {t('creators', { count: creatorTotal })}
          </h2>
          <CreatorList items={creators} label={t('creators', { count: creatorTotal })} testId="intent-creators" />
        </section>
      ) : null}
      {faq.length ? (
        <section className="mx-auto mt-12 max-w-[680px] px-4" aria-labelledby="intent-faq" data-testid="intent-faq">
          <h2 id="intent-faq" className="text-[20px] font-semibold text-ink">
            {t('faq')}
          </h2>
          <dl className="mt-3 divide-y divide-hair border-y border-hair">
            {faq.map((item, i) => (
              <div key={i} className="py-4">
                <dt className="font-medium text-ink">{item.question}</dt>
                <dd className="mt-1">
                  <RichContent data={item.answer as never} locale={locale} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <RenderBlocks sections={page.sections} context={context} />
    </article>
  )
}
