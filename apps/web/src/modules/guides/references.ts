import type { Payload, PayloadRequest, Where } from 'payload'

type Ref = 'pages' | 'articles' | 'authors' | 'article-categories'

/** Published row or latest draft: a pending draft's references count too. */
async function count(payload: Payload, collection: Ref, where: Where, req?: PayloadRequest): Promise<number> {
  const published = await payload.count({ collection, where, req, overrideAccess: true })
  if (collection === 'authors' || collection === 'article-categories') return published.totalDocs
  const latest = await payload.find({ collection, where, draft: true, limit: 1, depth: 0, select: {}, req, overrideAccess: true })
  return Math.max(published.totalDocs, latest.totalDocs)
}

/** The editor-content that uses a media file: shown to the person who tries to delete it. */
export async function mediaContentReferences(req: PayloadRequest, id: number | string): Promise<string[]> {
  const [pages, articles, authors] = await Promise.all([
    count(req.payload, 'pages', { 'seo.ogImage': { equals: id } }, req),
    count(req.payload, 'articles', { or: [{ cover: { equals: id } }, { 'seo.ogImage': { equals: id } }] }, req),
    count(req.payload, 'authors', { photo: { equals: id } }, req),
  ])
  return [
    ...(pages ? [`${pages} page(s)`] : []),
    ...(articles ? [`${articles} guide(s)`] : []),
    ...(authors ? [`${authors} author(s)`] : []),
  ]
}

/** Titles (English) of the guides that use a category or an author, for the delete refusal. */
export async function articlesUsing(req: PayloadRequest, where: Where): Promise<string[]> {
  const published = await req.payload.find({ collection: 'articles', where, limit: 5, depth: 0, locale: 'en', fallbackLocale: false, select: { title: true }, req, overrideAccess: true })
  const drafts = await req.payload.find({ collection: 'articles', where, draft: true, limit: 5, depth: 0, locale: 'en', fallbackLocale: false, select: { title: true }, req, overrideAccess: true })
  const titles = new Map([...published.docs, ...drafts.docs].map((d) => [d.id, d.title || `#${d.id}`]))
  return [...titles.values()]
}
