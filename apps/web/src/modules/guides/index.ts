// Public surface of the guides module (config-time code imports ./hooks, ./references and ./collections directly).
export { getArticle, getAuthor, getFeedItems, listArticles, listCategories, listGuidesForSitemap } from './queries'
export type { ArticleDetail, ArticleList, ArticlePage, ArticleSummary, AuthorEntry, CategoryEntry, CoverImage, GuidesForSitemap } from './queries'
// The mobile API (008).
export { getGuideV1, getGuidesV1 } from './api'
export { toWireArticle, toWireArticleSummary, toWireGuideList } from './wire'
