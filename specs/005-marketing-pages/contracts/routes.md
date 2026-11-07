# Contract: public routes, caching, SEO and test ids (005)

All routes live under `app/(site)/[locale]/` and exist at `/…` (English) and
`/ar/…`. Every page is a server component; client JavaScript is limited to the
existing brief builder island on intent pages and the register form. Anything
not listed is unchanged from features 001–002.

## Routes

| Route | Source | Cache tags | Time-based | Notes |
|---|---|---|---|---|
| `/{slug}` | `[slug]/page.tsx` | `pages`, `categories`, `media`, `option-sets` | no | `kind = standard`, published (or draft in preview). Miss → previous-slug redirect (`permanentRedirect`) → `notFound()` |
| `/terms`, `/terms/professional`, `/privacy` | `terms/[[...rest]]`, `terms/professional/[[...rest]]`, `privacy/[[...rest]]` | `legal-documents` | `revalidate = 60` | version in force, "applies from {date}" banner, link to versions |
| `/terms/versions`, `/terms/versions/{n}` (and `professional`, `privacy` equivalents) | same files, `rest` segments | `legal-documents` | `revalidate = 60` | list of published versions with periods; one version read-only; unknown `n` → `notFound()` |
| `/guides` | `guides/page.tsx` | `articles`, `article-categories`, `authors` | `revalidate = 60` | `?page=N`, 12 per page |
| `/guides/category/{slug}` | `guides/category/[slug]/page.tsx` | same | `revalidate = 60` | category with ≥ 1 live article, else `notFound()` |
| `/guides/author/{slug}` | `guides/author/[slug]/page.tsx` | same | `revalidate = 60` | author with ≥ 1 live article, else `notFound()` |
| `/guides/{slug}` | `guides/[slug]/page.tsx` | same + `media` | `revalidate = 60` | article; `Article` JSON-LD; related guides; CTA |
| `/guides/feed` | `guides/feed/route.ts` | `articles`, `authors` | `revalidate = 60` | RSS 2.0, `application/rss+xml; charset=utf-8`; locale from the path |
| `/hire/{slug}` | `hire/[slug]/page.tsx` | `pages`, `option-sets`, `creator-profiles`, `personas`, `categories`, `locations` | no | `kind = intent`; builder with preset; creator strip; FAQ; JSON-LD |
| any miss | `not-found.tsx` | `removed-paths` | no | "removed" vs "not found" copy by `x-pathname` header; status 404, `noindex` |
| `/sitemap.xml` | `app/sitemap.ts` | — (dynamic) | per request | adds the entries below |

`/next/preview?secret=…&path=…` (existing) enables draft mode for pages,
articles and legal documents; `ExitPreviewBar` is already in the layout.

## Metadata (every page of this feature)

- `title` / `description`: from `seo.*` else page title / summary; unique per
  page; max 60 / 160 enforced in the CMS.
- `alternates`: canonical for the visitor's language plus `en`, `ar`,
  `x-default`, built with the `{ en, ar }` overload of `alternates()` because
  page slugs differ by language.
- `openGraph`: title, description, locale, `type` (`website` or `article` with
  `publishedTime`/`authors` for articles), image from `seo.ogImage` or the
  article cover.
- `robots`: `noindex` when `seo.hideFromSearch`, on not-found/removed, and on
  draft preview. Pagination pages ≥ 2 stay indexable.
- Feed discovery: `<link rel="alternate" type="application/rss+xml">` in the
  guides routes.

## Structured data (JSON-LD, `<` escaped)

| Page | Types |
|---|---|
| Home (existing) | `Organization`, `FAQPage` (now built with `lexicalToText`) |
| Article | `Article` (headline, datePublished, dateModified, author `Person`, image, inLanguage) |
| Intent | `FAQPage` (if FAQ), `Service` (name, serviceType, areaServed, provider `Organization`, inLanguage) |
| Guides listing | none (ordinary `CollectionPage` metadata is enough) |

All builders are pure functions in `packages/domain/src/pages/structured-data.ts`.

## Sitemap entries added

Visible standard pages and intent pages (per-language paths as alternates),
the three legal pages (version archive pages are **not** listed), `/guides`,
categories and authors with ≥ 1 live article, live articles. Priorities:
home 1, legal 0.3, guides listing 0.6, articles 0.6, pages 0.5, intent 0.7.
Excluded: drafts, future-dated articles, `hideFromSearch`, tombstoned paths.

## Server actions and API

| Surface | Contract |
|---|---|
| `register` action (edit) | requires `acceptTerms = on` (error key `auth.errors.acceptTerms`); after creating the user writes one `legal-acceptances` row per applicable kind that has a version in force |
| Payload REST `/api/pages`, `/api/articles`, … | public reads return only live documents (access clauses in `data-model.md`); `legal-acceptances` has no public create |
| Feed | `GET /guides/feed` and `GET /ar/guides/feed`; 20 newest live articles with native text in that language; `Cache-Control` from `revalidate` |

## Navigation contract

`getNavigation(locale)` returns `{ header: NavItem[], footerGroups:
{ key, label, links: NavItem[] }[], legal: { kind, label, href }[] }`.
`Header` receives landing `navigation` + page header items (max 3 pages);
`Footer` receives `footerGroups` and `legal`. Unpublishing or deleting a page
removes its link on the next render (tag `pages`).

## Test ids

Tests carry the id of the scenario they prove: `MP-US1-S4`, `MP-FR-003`,
`MP-EDGE-slug-reserved`. `pnpm check:scenarios` is extended to also read
`specs/005-marketing-pages/quickstart.md`'s map (prefix `MP-`) and fail when an
id has no test.

## i18n and theme

Static strings in `messages/{en,ar}.json` under `pages.*`, `legal.*`,
`guides.*`, `intent.*`, `notFound.*` (extended) and `auth.acceptTerms*`. Every
route is verified in `ar` (RTL) and in dark mode; spacing uses logical
properties; dates are formatted with the locale (`Intl.DateTimeFormat`).
