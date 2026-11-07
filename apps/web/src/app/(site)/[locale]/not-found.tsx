import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { BriefBar, rowClass, RowContent } from '@/shared/ui/bar'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <section className="mx-auto max-w-[680px] px-4 pt-16">
      <h1 className="text-[34px] font-bold tracking-[-0.03em] text-ink">{t('title')}</h1>
      <p className="mt-2 text-mute">{t('body')}</p>
      <BriefBar size="sm" className="mt-6 py-1">
        <Link href="/" className={rowClass('open')}>
          <RowContent glyph="1" label={t("home")} />
        </Link>
      </BriefBar>
    </section>
  )
}
