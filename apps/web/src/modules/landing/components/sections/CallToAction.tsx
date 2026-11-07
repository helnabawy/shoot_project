import type { CallToActionBlock } from '@/payload-types'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { Section } from '../Section'

/** The closing action: a Top Hit on the bare ground, with an optional secondary row. */
export function CallToAction({
  block,
  contact,
  locale,
}: {
  block: CallToActionBlock
  contact: ContactDetails
  locale: string
}) {
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.body} emphasis>
      <div className="-mx-2 grid gap-1 lg:pt-1">
        <CtaLink cta={block.primary} contact={contact} locale={locale} />
        <CtaLink cta={block.secondary} contact={contact} locale={locale} variant="secondary" />
      </div>
    </Section>
  )
}
