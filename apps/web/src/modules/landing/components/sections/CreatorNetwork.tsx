import { networkSelection } from '@shoot/domain/creators'
import type { CreatorNetworkBlock } from '@/payload-types'
import { creatorPath, CreatorNetworkView, describeCreator, getDirectoryContext, getPublicCreators } from '@/modules/creators'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import type { Locale } from '@/shared/lib/locale'

/**
 * "Our network": creators picked by the editor's rule and count, as rows linking to their profiles.
 * Renders nothing until a creator is listed (Principle IV: a safe empty state, never invented cards).
 */
export async function CreatorNetwork({ block, contact, locale }: { block: CreatorNetworkBlock; contact: ContactDetails; locale: Locale }) {
  const [creators, context] = await Promise.all([getPublicCreators(locale), getDirectoryContext(locale)])
  const items = networkSelection(creators, block.rule, block.count).map((creator) => ({
    creator,
    view: describeCreator(creator, context.lookups, context.prefix, locale),
    href: creatorPath(creator.code, locale),
  }))
  return (
    <CreatorNetworkView
      anchor={block.anchor}
      heading={block.heading}
      subheading={block.subheading}
      items={items}
      cta={<CtaLink cta={block.cta} contact={contact} locale={locale} variant="secondary" />}
    />
  )
}
