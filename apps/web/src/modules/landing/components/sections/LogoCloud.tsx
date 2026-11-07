import type { LogoCloudBlock } from '@/payload-types'
import { CmsImage } from '@/shared/components/CmsImage'
import { Section } from '../Section'

/** Real client logos only; renders nothing until the owner adds some (PRODUCT.md). */
export function LogoCloud({ block }: { block: LogoCloudBlock }) {
  const logos = block.logos ?? []
  if (logos.length === 0) return null
  return (
    <Section id={block.anchor} heading={block.heading}>
      <ul className="flex flex-wrap items-center gap-x-8 gap-y-5">
        {logos.map((logo, i) => (
          <li key={logo.id ?? i} className="h-8">
            <CmsImage
              media={logo.image}
              dark={logo.imageDark}
              size="thumbnail"
              sizes="160px"
              className="h-8 w-auto object-contain opacity-80"
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}
