import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { ComponentProps } from 'react'
import { localizeHref } from '@/shared/i18n/href'

type Data = ComponentProps<typeof RichText>['data']

const EXTERNAL = /^(https?:\/\/|mailto:|tel:)/i

/**
 * The only hrefs long-form text may produce (FR-015): site paths (in the reader's language), web,
 * mail and phone links. Anything else, `javascript:` included, becomes an inert "#".
 */
export function safeHref(url: string | null | undefined, locale?: string): string {
  const value = (url ?? '').trim()
  if (value.startsWith('/') && !value.startsWith('//')) return locale ? localizeHref(value, locale) : value
  return EXTERNAL.test(value) ? value : '#'
}

const isSitePath = (href: string) => href.startsWith('/')

/** One reading style for every long-form text: pages, legal documents, guides. Never renders raw HTML. */
export function RichContent({ data, locale, className }: { data: Data; locale?: string; className?: string }) {
  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    link: ({ node, nodesToJSX }) => {
      const href = safeHref(node.fields?.url, locale)
      const external = !isSitePath(href) && href !== '#'
      return (
        <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {nodesToJSX({ nodes: node.children })}
        </a>
      )
    },
    autolink: ({ node, nodesToJSX }) => {
      const href = safeHref(node.fields?.url, locale)
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {nodesToJSX({ nodes: node.children })}
        </a>
      )
    },
    upload: ({ node }) => {
      const value = node.value as { url?: string | null; alt?: string | null; width?: number | null; height?: number | null } | number | string
      if (!value || typeof value !== 'object' || !value.url) return null
      // Media always carries alt text in the CMS; an empty one is treated as decorative, never invented.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={value.url} alt={value.alt ?? ''} width={value.width ?? undefined} height={value.height ?? undefined} loading="lazy" decoding="async" />
    },
  })
  return (
    <div
      className={
        className ??
        'max-w-[65ch] text-[16px] leading-relaxed text-ink [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-4 [&_blockquote]:border-s-2 [&_blockquote]:border-hair [&_blockquote]:ps-4 [&_blockquote]:text-mute [&_h2]:mt-6 [&_h2]:text-[22px] [&_h2]:font-bold [&_h3]:mt-5 [&_h3]:text-[18px] [&_h3]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:ps-5 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:ps-5'
      }
    >
      <RichText data={data} converters={converters} disableContainer />
    </div>
  )
}
