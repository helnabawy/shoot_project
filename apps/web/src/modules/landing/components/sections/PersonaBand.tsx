import { interpolatePersonaCopy } from '@shoot/domain/personas'
import type { PersonaBandBlock } from '@/payload-types'
import type { AudiencePersona } from '@/modules/personas/queries'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { BriefBar, ResultRow } from '@/shared/ui/bar'
import { Section } from '../Section'

/** The creator invitation: the second (smaller) bar on the page, with its own Top Hit. */
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
  return (
    <Section id={block.anchor}>
      <BriefBar size="sm">
        <div className="border-b border-hair px-4 pt-4 pb-3">
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink text-balance">
            {fill(block.heading)}
          </h2>
          {block.body ? (
            <p className="mt-1.5 text-[15px] leading-relaxed text-mute">{fill(block.body)}</p>
          ) : null}
        </div>
        {block.layout === 'perPersona' ? (
          <div className="py-1">
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
        <div className="py-2">
          <CtaLink cta={block.cta} contact={contact} locale={locale} />
        </div>
      </BriefBar>
    </Section>
  )
}
