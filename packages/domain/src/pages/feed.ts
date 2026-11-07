export const FEED_ITEM_LIMIT = 20

export interface FeedItem {
  title: string
  summary: string
  /** Absolute address. */
  link: string
  publishedAt: string
  author?: string | null
}

export interface Feed {
  title: string
  description: string
  /** Absolute address of the site section the feed belongs to. */
  link: string
  /** Absolute address of the feed itself. */
  selfLink: string
  language: string
  items: readonly FeedItem[]
  /** Used as the build date of a feed with no items. */
  now: Date
}

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string)

/** RSS 2.0 for the newest items; every text is escaped, every address absolute. */
export function buildRss(feed: Feed): string {
  const items = [...feed.items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, FEED_ITEM_LIMIT)
  const newest = items[0] ? new Date(items[0].publishedAt) : feed.now
  const entries = items
    .map(
      (item) =>
        `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(item.summary)}</description>${item.author ? `\n      <dc:creator>${escapeXml(item.author)}</dc:creator>` : ''}
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(feed.link)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>${escapeXml(feed.language)}</language>
    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feed.selfLink)}" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>
`
}
