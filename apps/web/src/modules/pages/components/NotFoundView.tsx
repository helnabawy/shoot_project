import { getTranslations } from 'next-intl/server'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { BriefBar, rowClass, RowContent } from '@/shared/ui/bar'
import Link from 'next/link'

export type NotFoundVariant = 'notFound' | 'removed'

/**
 * One designed page for two cases: an address we cannot find, and an address that used to be a page or a
 * guide. Both say plainly what happened and offer the same next steps: the brief, the guides, WhatsApp.
 */
export async function NotFoundView({
  variant,
  locale,
  whatsapp,
  hasGuides,
}: {
  variant: NotFoundVariant
  locale: Locale
  /** The WhatsApp number and default message from site settings; the row is left out without a number. */
  whatsapp?: { number?: string | null; message?: string | null }
  hasGuides: boolean
}) {
  const t = await getTranslations({ locale, namespace: 'notFound' })
  const chat = whatsappHref(whatsapp?.number, whatsapp?.message)
  return (
    <section className="mx-auto max-w-[680px] px-4 pt-16" data-testid="not-found" data-variant={variant}>
      <h1 className="text-[34px] font-bold tracking-[-0.03em] text-ink text-balance">{variant === 'removed' ? t('removedTitle') : t('title')}</h1>
      <p className="mt-2 text-mute">{variant === 'removed' ? t('removedBody') : t('body')}</p>
      <BriefBar size="sm" className="mt-6 py-1">
        <Link href={localizeHref('/', locale)} className={rowClass('open')}>
          <RowContent glyph="1" label={t('brief')} />
        </Link>
        {hasGuides ? (
          <Link href={localizeHref('/guides', locale)} className={rowClass('open')}>
            <RowContent glyph="2" label={t('guides')} />
          </Link>
        ) : null}
        {chat ? (
          <a href={chat} className={rowClass('open')} target="_blank" rel="noopener noreferrer">
            <RowContent glyph="3" label={t('whatsapp')} />
          </a>
        ) : null}
      </BriefBar>
    </section>
  )
}
