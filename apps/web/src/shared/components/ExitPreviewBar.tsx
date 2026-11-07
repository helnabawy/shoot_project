import { getTranslations } from 'next-intl/server'

/** Shown while an editor previews unpublished changes (FR-013). */
export async function ExitPreviewBar() {
  const t = await getTranslations('preview')
  return (
    <div role="status" className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-attention px-4 py-2 text-[14px] text-on-attention">
      <span>{t('active')}</span>
      {/* A route handler that clears the draft cookie and redirects: it needs a full navigation. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/next/exit-preview" className="font-semibold underline">
        {t('exit')}
      </a>
    </div>
  )
}
