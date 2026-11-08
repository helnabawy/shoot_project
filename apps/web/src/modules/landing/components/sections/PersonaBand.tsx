import { interpolatePersonaCopy } from '@shoot/domain/personas'
import type { PersonaBandBlock } from '@/payload-types'
import type { AudiencePersona } from '@/modules/personas/queries'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { VisitorOnly } from '@/shared/components/SessionNav'
import { BriefBar, ResultRow } from '@/shared/ui/bar'
import { Section } from '../Section'

/**
 * The creator invitation: the second (smaller) bar on the page, with its own Top Hit. From 1024 px
 * it runs the full section width with the invitation at the start and its Top Hit at the end.
 * Signed-in members already have an account, so it is hidden from them.
 */
export function PersonaBand({
  block,
  personas,
  contact,
  locale,
}: {
  block: PersonaBandBlock
  personas: AudiencePersona[]
  contact: ContactDetails
  locale: string
}) {
  if (personas.length === 0) return null
  const fill = (text?: string | null) =>
    text ? interpolatePersonaCopy(text, personas, { locale }) : ''
  const rows = block.layout === 'perPersona'
  return (
    <VisitorOnly>
      <Section id={block.anchor}>
        <BriefBar
          size="sm"
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-center"
        >
          <div className="border-b border-hair px-4 pt-4 pb-3.5 sm:px-5 sm:pt-5 lg:border-b-0 lg:py-6 lg:ps-7">
            <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink text-balance">
              {fill(block.heading)}
            </h2>
            {block.body ? (
              <p className="mt-1.5 max-w-[52ch] text-[15px] leading-relaxed text-pretty text-mute">
                {fill(block.body)}
              </p>
            ) : null}
          </div>
          {rows ? (
            <div className="py-1 lg:col-span-2 lg:row-start-2 lg:border-t lg:border-hair lg:py-1.5">
              {personas.map((p) => (
                <ResultRow
                  key={p.id}
                  glyph={p.glyph}
                  label={interpolatePersonaCopy(p.copy?.providerCta || '{persona.singular}', p, {
                    locale,
                  })}
                  trailing={p.description ?? undefined}
                />
              ))}
            </div>
          ) : null}
          <div className="py-2 lg:col-start-2 lg:row-start-1 lg:py-0 lg:pe-2">
            <CtaLink cta={block.cta} contact={contact} locale={locale} />
          </div>
        </BriefBar>
      </Section>
    </VisitorOnly>
  )
}
