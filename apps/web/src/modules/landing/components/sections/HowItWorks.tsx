import type { HowItWorksBlock } from '@/payload-types'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { GlyphTile } from '@/shared/ui/bar'
import { RowList, Section } from '../Section'

/** Numbered rows: the order carries meaning, so the numbers stay. */
export function HowItWorks({
  block,
  contact,
  locale,
}: {
  block: HowItWorksBlock
  contact: ContactDetails
  locale: string
}) {
  const steps = block.steps ?? []
  if (steps.length === 0) return null
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.subheading}>
      <RowList as="ol">
        {steps.map((step, i) => (
          <li key={step.id ?? i} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 px-4 py-3.5">
            <GlyphTile tone="set">{i + 1}</GlyphTile>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">{step.title}</h3>
              {step.body ? (
                <p className="mt-0.5 text-[15px] leading-relaxed text-mute">{step.body}</p>
              ) : null}
            </div>
          </li>
        ))}
      </RowList>
      {block.cta?.label ? (
        <div className="mt-4 -mx-2">
          <CtaLink cta={block.cta} contact={contact} locale={locale} />
        </div>
      ) : null}
    </Section>
  )
}
