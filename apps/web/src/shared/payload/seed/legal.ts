import { LEGAL_KINDS, type LegalKind } from '@shoot/domain/pages'
import type { Payload } from 'payload'
import { pickLocale, richText, withRowIds, type L } from './localize'

const context = { disableRevalidate: true }

const TITLES: Record<LegalKind, L> = {
  terms: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
  'professional-terms': { en: 'Professional Terms', ar: 'شروط المحترفين' },
  privacy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
}

/** Local, test and `.test`/`.localhost` hosts only: there sample text may go live so sign-up and e2e work. */
export function isLocalSeedHost(siteUrl: string | undefined): boolean {
  try {
    const host = new URL(siteUrl ?? '').hostname
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost') || host.endsWith('.test')
  } catch {
    return false
  }
}

const sample = (kind: LegalKind): L<ReturnType<typeof richText>> => ({
  en: richText(`Sample text for development: this is not legal advice. The ${TITLES[kind].en} are written by the owner and reviewed by counsel before launch.`),
  ar: richText(`نص تجريبي للتطوير وليس استشارة قانونية. يكتب المالك ${TITLES[kind].ar} وتراجعها جهة قانونية قبل الإطلاق.`, 'rtl'),
})

/**
 * Version 1 of each legal document. On a local or test host it is published with clearly marked
 * sample text; anywhere else it is a draft marked as a placeholder, which cannot be published, so
 * nothing unreviewed goes live (research R10). An existing document is never touched.
 */
export async function seedLegalDocuments(payload: Payload, options: { siteUrl?: string; log: (message: string) => void }): Promise<void> {
  const local = isLocalSeedHost(options.siteUrl)
  for (const kind of LEGAL_KINDS) {
    const found = await payload.count({ collection: 'legal-documents', where: { kind: { equals: kind } } })
    if (found.totalDocs > 0) continue
    const tree = {
      kind,
      title: TITLES[kind],
      versions: [
        {
          state: local ? 'published' : 'draft',
          placeholder: !local,
          effectiveFrom: new Date().toISOString(),
          changeSummary: { en: 'First version', ar: 'الإصدار الأول' },
          body: sample(kind),
        },
      ],
    }
    const en = await payload.create({ collection: 'legal-documents', data: pickLocale(tree, 'en') as never, locale: 'en', depth: 0, context })
    await payload.update({
      collection: 'legal-documents',
      id: en.id,
      data: withRowIds(pickLocale(tree, 'ar'), en) as never,
      locale: 'ar',
      depth: 0,
      context,
    })
    options.log(`Legal document ${kind}: version 1 ${local ? 'published (sample text)' : 'created as a draft placeholder'}`)
  }
}
