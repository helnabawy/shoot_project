import type { LegalKind } from '@shoot/domain/pages'
import { LEGAL_PATHS } from '@shoot/domain/pages'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { alternates } from '@/shared/lib/seo'
import type { Locale } from '@/shared/lib/locale'
import { LegalView } from './components/LegalView'
import { VersionList } from './components/VersionList'
import { getLegalDocument, getLegalVersion, getLegalVersions } from './queries'

type RouteProps = { params: Promise<{ locale: string; rest?: string[] }> }

/** `rest` after the document's address: [] current, ['versions'] list, ['versions', n] one version. */
function parse(rest: string[] | undefined): { page: 'current' } | { page: 'list' } | { page: 'version'; version: number } | null {
  if (!rest || rest.length === 0) return { page: 'current' }
  if (rest.length === 1 && rest[0] === 'versions') return { page: 'list' }
  if (rest.length === 2 && rest[0] === 'versions' && /^[1-9]\d{0,3}$/.test(rest[1]!)) return { page: 'version', version: Number(rest[1]) }
  return null
}

/** Time-based so a version that begins later takes over within a minute without anyone publishing (research R3). */
export const legalRevalidate = 60

export function legalMetadata(kind: LegalKind) {
  return async ({ params }: RouteProps): Promise<Metadata> => {
    const { locale, rest } = await params
    const route = parse(rest)
    if (!route) return {}
    const doc = await getLegalDocument(kind, locale as Locale)
    if (!doc) return {}
    return {
      title: doc.title,
      alternates: alternates(LEGAL_PATHS[kind] + (rest?.length ? `/${rest.join('/')}` : ''), locale as Locale),
      robots: route.page === 'current' ? undefined : { index: false, follow: true },
    }
  }
}

export function legalPage(kind: LegalKind) {
  return async function LegalPage({ params }: RouteProps) {
    const { locale: raw, rest } = await params
    setRequestLocale(raw)
    const locale = raw as Locale
    const route = parse(rest)
    if (!route) notFound()
    const basePath = LEGAL_PATHS[kind]
    if (route.page === 'list') {
      const list = await getLegalVersions(kind, locale)
      if (!list) notFound()
      return <VersionList title={list.title} versions={list.versions} basePath={basePath} locale={locale} />
    }
    if (route.page === 'version') {
      const view = await getLegalVersion(kind, route.version, locale)
      if (!view) notFound()
      return <LegalView view={view} locale={locale} basePath={basePath} archive />
    }
    const { isEnabled: draft } = await draftMode()
    const view = await getLegalDocument(kind, locale, { draft })
    if (!view) notFound()
    return <LegalView view={view} locale={locale} basePath={basePath} />
  }
}
