import type { LandingPage } from '@/payload-types'
import type { SpecialtyCounts } from '@shoot/domain/creators'
import type { AudienceCategory, AudiencePersona } from '@/modules/personas/queries'
import type { ContactDetails } from '@/shared/components/CtaLink'
import { CallToAction } from './sections/CallToAction'
import { CategoriesGrid } from './sections/CategoriesGrid'
import { CreatorNetwork } from './sections/CreatorNetwork'
import type { Locale } from '@/shared/lib/locale'
import { Faq } from './sections/Faq'
import { Features } from './sections/Features'
import { HowItWorks } from './sections/HowItWorks'
import { LogoCloud } from './sections/LogoCloud'
import { PersonaBand } from './sections/PersonaBand'
import { RichTextSection } from './sections/RichTextSection'

export interface BlockContext {
  contact: ContactDetails
  personas: AudiencePersona[]
  categories: AudienceCategory[]
  /** Real counts per category id from the listed creators; absent means none to show. */
  specialtyCounts?: Record<string, SpecialtyCounts>
  locale: string
}

type Section = NonNullable<LandingPage['sections']>[number]

/** Maps each CMS block to its component; unknown block types are skipped (US1-S5). */
export function RenderBlocks({
  sections,
  context,
}: {
  sections: Section[] | null | undefined
  context: BlockContext
}) {
  return (
    <>
      {(sections ?? []).map((block, i) => {
        const key = block.id ?? `${block.blockType}-${i}`
        switch (block.blockType) {
          case 'howItWorks':
            return (
              <HowItWorks
                key={key}
                block={block}
                contact={context.contact}
                locale={context.locale}
              />
            )
          case 'features':
            return <Features key={key} block={block} />
          case 'categoriesGrid':
            return (
              <CategoriesGrid
                key={key}
                block={block}
                audienceCategories={context.categories}
                counts={context.specialtyCounts}
                contact={context.contact}
                locale={context.locale}
              />
            )
          case 'creatorNetwork':
            return <CreatorNetwork key={key} block={block} contact={context.contact} locale={context.locale as Locale} />
          case 'personaBand':
            return (
              <PersonaBand
                key={key}
                block={block}
                personas={context.personas}
                contact={context.contact}
                locale={context.locale}
              />
            )
          case 'faq':
            return <Faq key={key} block={block} />
          case 'logoCloud':
            return <LogoCloud key={key} block={block} />
          case 'richText':
            return <RichTextSection key={key} block={block} />
          case 'callToAction':
            return (
              <CallToAction
                key={key}
                block={block}
                contact={context.contact}
                locale={context.locale}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}
