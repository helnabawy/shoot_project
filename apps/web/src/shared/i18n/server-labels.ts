import 'server-only'
import { getTranslations } from 'next-intl/server'
import { otherLocale, type Locale } from '@/shared/lib/locale'
import type { LocaleSwitcherProps } from './LocaleSwitcher'
import type { ThemeLabels } from '@/shared/theme/ThemeToggle'
import { briefLabelsFrom, type BriefLabels } from '@/modules/brief/labels'

/** Translated labels for client islands, resolved on the server so pages ship no i18n runtime. */
export async function chromeLabels(locale: Locale): Promise<{ theme: ThemeLabels; locale: Omit<LocaleSwitcherProps, 'className'>; menu: { openLabel: string; closeLabel: string } }> {
  const t = await getTranslations({ locale })
  return {
    theme: { label: t('theme.label'), light: t('theme.light'), dark: t('theme.dark'), system: t('theme.system') },
    locale: { target: otherLocale(locale), label: t('locale.switchTo'), ariaLabel: t('locale.switchLabel') },
    menu: { openLabel: t('a11y.openMenu'), closeLabel: t('a11y.closeMenu') },
  }
}

export async function briefLabels(locale: Locale): Promise<BriefLabels> {
  const t = await getTranslations({ locale })
  return briefLabelsFrom((key) => t(key as never), (key) => String(t.raw(key as never)))
}
