import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import ar from '../../messages/ar.json'
import en from '../../messages/en.json'

const MESSAGES = { en, ar }

/** Renders inside the i18n provider with the page's lang/dir, like the [locale] layout does. */
export function renderWithLocale(ui: ReactElement, { locale = 'en', ...options }: { locale?: 'en' | 'ar' } & RenderOptions = {}) {
  const container = document.createElement('div')
  container.setAttribute('lang', locale)
  container.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
  document.body.appendChild(container)
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Dubai">
      {ui}
    </NextIntlClientProvider>,
    { container, ...options },
  )
}
