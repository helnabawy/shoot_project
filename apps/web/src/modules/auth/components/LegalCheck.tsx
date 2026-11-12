'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { FieldError } from '@/shared/ui/Field'

export type LegalLinks = Partial<Record<'terms' | 'professional-terms' | 'privacy', { label: string; href: string } | null>>

/** The acceptance checkbox with links to the documents in force (005); a 44 px line. */
export function LegalCheck({ id, legal, professional, error }: { id: string; legal?: LegalLinks; professional: boolean; error?: string }) {
  const t = useTranslations('auth')
  return (
    <div className="border-t border-hair px-4 py-3" data-testid="accept-terms">
      <label className="flex min-h-11 items-start gap-3 text-[14px] text-ink">
        <input
          type="checkbox"
          name="acceptTerms"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-accept-error` : undefined}
          className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
        />
        <span>
          {t.rich(professional ? 'acceptTermsWithProfessional' : 'acceptTerms', {
            terms: (chunks) => <LegalLink doc={legal?.terms}>{chunks}</LegalLink>,
            privacy: (chunks) => <LegalLink doc={legal?.privacy}>{chunks}</LegalLink>,
            professional: (chunks) => <LegalLink doc={legal?.['professional-terms']}>{chunks}</LegalLink>,
          })}
        </span>
      </label>
      {error ? <FieldError id={`${id}-accept-error`}>{error}</FieldError> : null}
    </div>
  )
}

/** A link to a legal document, or the plain words when it is not published yet. */
function LegalLink({ doc, children }: { doc: { href: string } | null | undefined; children: ReactNode }) {
  if (!doc) return <>{children}</>
  return (
    <Link href={doc.href} target="_blank" className="font-medium underline">
      {children}
    </Link>
  )
}
