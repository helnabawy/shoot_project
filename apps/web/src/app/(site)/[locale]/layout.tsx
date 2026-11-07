import '../globals.css'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'
import { routing } from '@/i18n/routing'
import { FloatingWhatsApp } from '@/modules/contact/components/FloatingWhatsApp'
import { getLandingPage } from '@/modules/landing/queries'
import { getNavigation } from '@/modules/pages'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { ExitPreviewBar } from '@/shared/components/ExitPreviewBar'
import { Footer } from '@/shared/components/Footer'
import { Header } from '@/shared/components/Header'
import { JsFlag } from '@/shared/components/JsFlag'
import { dirFor, type Locale } from '@/shared/lib/locale'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'

export function generateStaticParams() {
  // Image builds have no database: skip pre-rendering and let the first request render and cache
  // each locale (CMS edits still revalidate it by tag).
  if (process.env.SKIP_BUILD_STATIC_GENERATION === 'true') return []
  return routing.locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efe9e3' },
    { media: '(prefers-color-scheme: dark)', color: '#141416' },
  ],
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: t('siteName'), template: `%s · ${t('siteName')}` },
    description: t('defaultDescription'),
  }
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const typed = locale as Locale
  const { isEnabled: preview } = await draftMode()
  const [settings, landing, nav, t] = await Promise.all([
    getSiteSettings(typed),
    getLandingPage({ locale: typed, draft: preview }),
    getNavigation(typed),
    getTranslations({ locale, namespace: 'a11y' }),
  ])
  const tContact = await getTranslations({ locale, namespace: 'contact' })

  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>
      <head>
        <JsFlag />
      </head>
      <body className="antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-ground"
        >
          {t('skipToContent')}
        </a>
        <ThemeProvider>
          <div className="sticky top-0 z-40">
            {preview ? <ExitPreviewBar /> : null}
            <Header
              locale={typed}
              siteName={settings.siteName}
              logo={settings.logo}
              logoDark={settings.logoDark}
              navigation={[
                ...(landing.navigation ?? []).map((n) => ({ label: n.label, target: n.target })),
                ...nav.header.map((n) => ({ label: n.label, target: n.href })),
              ]}
            />
          </div>
          <main id="content">{children}</main>
          <Footer
            locale={typed}
            siteName={settings.siteName}
            social={(settings.social ?? []).map((s) => ({ platform: s.platform, url: s.url }))}
            contactEmail={settings.contactEmail}
            phoneNumber={settings.phoneNumber}
            groups={nav.footerGroups}
            legal={nav.legal}
          />
          <FloatingWhatsApp
            number={settings.whatsappNumber}
            message={settings.whatsappDefaultMessage}
            label={tContact('whatsappFloating')}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
