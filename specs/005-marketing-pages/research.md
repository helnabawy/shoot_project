# Research: Marketing, Legal and SEO Pages (005)

Decisions the spec left open, with rationale and rejected alternatives. Each is
binding for `data-model.md`, `contracts/` and `tasks.md`. Facts about the
existing code were read on 2026-11-07 (paths are relative to `apps/web/src`
unless noted).

## R1. Three modules, one set of shared page blocks

**Decision**: add `modules/pages` (Page, RemovedPaths, navigation queries),
`modules/legal` (LegalDocuments, LegalAcceptances) and `modules/guides`
(Articles, ArticleCategories, Authors, feed). Page sections reuse the exact
block definitions in `modules/landing/blocks` (`landingBlocks`) and the same
`RenderBlocks` renderer; the landing module exports them through a new
`modules/landing/index.ts`. Intent pages are the `pages` collection with
`kind = 'intent'`, not a fourth collection.

**Why**: Principle V (module boundaries) and the constitution's "reads from a
CMS collection, code defines shape". Blocks already carry bilingual fields,
anchors and CTAs; copying them would fork the editor experience. One `pages`
collection means one slug-uniqueness rule, one draft/preview flow, one sitemap
query.

**Rejected**: a separate `intent-pages` collection (duplicates sections, draft
flow and slug rules for four extra fields); putting legal text into `pages`
(versions, effective dates and acceptance records have different invariants).

## R2. Page addresses: localised slug, single segment, route precedence

**Decision**: `pages.slug` is `localized: true`, required in English only,
single segment (`/studios`, not `/company/studios`), lower-case letters,
digits and hyphens, Arabic letters allowed, max 80 characters. The public
route is `app/(site)/[locale]/[slug]/page.tsx`; Next's static segments win
over a dynamic one, so `/login`, `/creators`, `/terms` and friends are never
shadowed even if a validation were missed. A reserved list still refuses them
at save (R4) because a page nobody can reach is an editor bug, not a routing
feature. Uniqueness is checked per `(locale, kind)` in a `beforeValidate`
hook that reads published and draft siblings; the adapter creates **no** unique index on a
localized column (checked in `pages-slug.int.test.ts`), so the hook is the
contract and is tested on every write path.

**Language switching**: the switcher keeps the current path, so `/ar/studios`
may be requested when the Arabic slug differs. `getPageBySlug` therefore
falls back to the other locale's slug and answers with a permanent redirect to
the page's address in the visitor's language (also covers `previousSlugs`).

**Why**: the spec asks for "slug per language" and the roadmap's pages
(`/studios`, `/privacy`) are one level deep. Nested paths add a parent
relationship, breadcrumbs and redirect chains for no stated need.

**Rejected**: catch-all `[...slug]` (nested paths are not required; a
catch-all also swallows 404 semantics we need for tombstones); non-localised
slug (spec requires one per language).

## R3. Draft, preview, scheduling

**Decision**: `pages` and `articles` use Payload `versions: { drafts: true }`
(as `landing-page` and `creator-profiles` do). Public reads are restricted by
access to `_status = published`; editors read drafts. Preview reuses
`app/next/preview/route.ts` (secret + editor session), each collection's
`admin.preview` returns `/next/preview?secret=…&path=<public path>`; the page
route reads `draftMode()` and, when enabled, queries with `draft: true` and
bypasses the cache (the `getLandingPage` pattern). Articles add
`publishedAt` (date, required to publish, may be in the future): the public
access clause is `{ _status: published, publishedAt <= now }` computed at
request time, so a future article is invisible to every query that goes
through access, and the queries pass `overrideAccess: false`.

**Time-dependent output (SC-004, FR-016)**: pages that depend on "now" (guides
listing, article, feed, legal pages, sitemap) export `revalidate = 60` in
addition to tag revalidation. A scheduled article therefore appears within 60
seconds after its time without any editor action, and no cron is introduced.
The cached query helpers take `now` as a parameter so tests pin the clock
(Principle III, determinism).

**Rejected**: Payload's job queue / `schedulePublish` (needs a runner, a new
operational dependency); a cron route (one more thing to deploy and monitor).

## R4. Reserved addresses and redirects

**Decision**: `packages/domain/src/pages/slug.ts` exports
`validatePageSlug(slug, { locale })` returning an error key or `null`, and
`RESERVED_SLUGS`: `login register account admin api next ar creators work book
guides hire terms privacy sitemap.xml robots.txt feed _next`. Page slugs in
`ar` are checked against the same list after normalisation. Renames: a
`beforeChange` hook appends `{ locale, slug }` of the old value to
`previousSlugs` (non-localised array, max 20); the page route, on a miss,
looks up `previousSlugs` and answers with `permanentRedirect` to the current
slug. A slug that is later reused by another page wins over a stale redirect.

**Why**: cheap, testable as a pure function (100% domain coverage), and the
only way to keep search equity when an editor tidies a slug.

## R5. Articles use one address for both languages

**Decision**: `articles.slug` is non-localised, immutable after save (the
existing `slugField` + `preventSlugChange` from `shared/payload/fields/slug.ts`
that creators/categories already use). Categories and authors do the same.
Titles, summaries, text, category names and bios are localised with English
fallback.

**Why**: one address means one canonical per article, simple `hreflang`, no
redirect table for articles, and the same convention as `/work/{specialty}`
and `/creators/{code}`. Arabic-script URLs for articles can be added later by
making the slug localised; nothing here blocks it.

**Rejected**: localised article slugs now (doubles the redirect and
uniqueness machinery for a P2 story).

## R6. "Removed" notice instead of HTTP 410

**Decision**: a deleted page or article writes a row to `removed-paths`
(`kind`, `locale`, `path`, `removedAt`) from its `afterDelete` hook; creating
or publishing a document at that path deletes the row. The dynamic routes call
`notFound()` for every miss, and the shared not-found UI reads the request
path's tombstone to choose "this page has been removed" or "we can't find
that page". Status is 404 with `noindex`.

**Why**: Next.js 16 App Router pages cannot set an arbitrary status; only
route handlers can. A 410 would require either a DB lookup in `proxy.ts` on
every request (Principle II/V cost, per-request connection) or turning every
dynamic page into a route handler without layouts. Search engines treat a
persistent 404 and 410 the same after a short while. The spec was amended
(FR-005, Story 5) to match.

**How the not-found UI knows the path**: `not-found.tsx` cannot read route
params, but it can read request headers. `proxy.ts` wraps the next-intl
handler and forwards the request path as an `x-pathname` request header (no
database work in the proxy). `not-found.tsx` reads it, asks the cached
`isRemovedPath(locale, path)` query (tag `removed-paths`) and renders
"removed" or "not found" copy; every miss, tombstoned or not, still goes
through `notFound()`, so status and `noindex` are identical. **Spike result (2026-11-07):** the header reaches the boundary under
`next dev` and the page answers 404 with `noindex` and the "removed" copy for
a deleted page, so the fallback was not needed.

**Rejected**: soft delete (`status: archived`) — editors expect Delete to
delete; tombstones are the only extra row.

## R7. Navigation and footer placement are fields on the page

**Decision**: `pages.placement` group: `inHeader` (checkbox), `footerGroup`
(text, matches `site-settings.footerGroups[].key`), `navLabel` (localised,
defaults to the title), `order` (number). `site-settings` gains a
"Footer" tab with `footerGroups` (array, max 4: `key`, `label` localised) and
the fixed legal links come from `legal-documents`, not from page placement.
Limits (FR, edge case): at most 3 header pages, 4 groups, 24 footer links in
all; enforced in `pages` `beforeValidate` using a domain function
`checkPlacementLimits(existing, candidate)`. Header items from pages are
appended after the landing page's own `navigation` items in the layout.
Query `getNavigation(locale)` returns `{ header, footerGroups, legal }`
cached under tags `pages`, `legal-documents`, `site-settings`.

**Why**: Principle IV (nothing hardcoded) with the smallest schema: no
separate "menu" collection. Footer group keys are CMS data defined in site
settings, so "Company" / "Help" are not code constants.

**Rejected**: a `navigation` global with arrays of page relationships
(second source of truth; breaks when a page is deleted, which the spec says
must remove the link at once); fixed footer groups in code.

## R8. Legal documents: one document per kind, versions as rows

**Decision**: `legal-documents` has one document per `kind` (`terms`,
`professional-terms`, `privacy`, unique), with a `versions` array. Each row:
`version` (integer, assigned by hook, never edited), `effectiveFrom` (date),
`state` (`draft` | `published`), `placeholder` (checkbox), `changeSummary`
(localised textarea), `body` (localised rich text), `publishedAt`/`publishedBy`
(stamped). Rules (domain `legal.ts`, hook-enforced): published rows are
immutable for editors (only admins can edit a published row, FR-018); two
published rows may not share an `effectiveFrom`; `effectiveFrom` defaults to
the publish time; a row with `placeholder = true` cannot be published; a
published row cannot be deleted. The version in force is
`currentVersion(rows, now)` = the published row with the greatest
`effectiveFrom ≤ now`; `upcomingVersion` is the next one after `now`.
Public addresses are fixed by kind: `/terms`, `/terms/professional`,
`/privacy` (+ `/ar`), plus `…/versions` (list) and `…/versions/{n}`.

**Arabic governance**: the English body governs. If the Arabic body is empty
the Arabic page shows English with a notice (spec scenario 5); if both exist
the Arabic page shows a short "English governs" line. The notice text is a
static message-file string.

**Why**: versions are rows in one document because the invariants (no
overwriting, derived "in force", ordering) are about the set, and one
document per kind makes the footer, registration and archive queries trivial.

**Rejected**: Payload drafts on the document (a draft of the whole doc would
also hide edits to old versions and mixes with "published rows are immutable");
one document per version (needs a parent link and a uniqueness rule across
documents).

## R9. Acceptance records and registration

**Decision**: `legal-acceptances` (append-only): `user`, `kind`, `version`,
`documentVersionAtAcceptance`, `acceptedAt`, `locale`. Created by the
`register` server action with the local API (`overrideAccess: true`) after
the user is created, one row per applicable kind (terms + privacy for every
account, + professional terms for providers), only for kinds that have a
version in force. Access: create nobody via REST; read admin or the owner;
update/delete nobody (admins excepted for erasure requests, deliberately
`isAdmin` for delete only). `registerSchema` gains `acceptTerms` (must be
`'on'`; message key `auth.errors.acceptTerms`). `RegisterForm` receives the
current legal links from the page (`getLegalForRegistration(locale)`) and
renders a labelled checkbox with links. If a kind has no live version the
statement is rendered without that link and nothing is recorded for it (the
launch checklist in `quickstart.md` requires all three to be live before
public launch; the plan does not block sign-up on content that may not exist
yet in a fresh install).

**Why**: records must not depend on a client-sent version number (the server
reads what was current at submit time); append-only keeps the audit trail
honest.

**Rejected**: embedding versions on `users` (every account row grows, hook
conflicts with the self-update access).

## R10. Seed content and placeholders

**Decision**: `shared/payload/seed/` gets a `pages.ts` seed with: a Studios
page (rich text, call to action, footer group "Company"), legal documents with
version 1 per kind. On local and test hosts (the same host guard
`demo-creators.ts` uses) version 1 is published with clearly marked sample
text so registration and e2e work; on any other host version 1 is created as
`placeholder = true`, `state = draft`, so nothing unreviewed goes live (R8).
No articles, no intent pages and no authors in the default seed (no invented
proof, Principle IX); an opt-in `seed:demo-guides` mirrors `demo-creators`
for local/e2e use.

## R11. Guides: listing, categories, authors, pagination, feed

**Decision**:
- Routes: `/guides` (listing), `/guides/category/{slug}`, `/guides/author/{slug}`,
  `/guides/{slug}` (article), `/guides/feed` (RSS 2.0, `application/rss+xml`).
  The feed address has **no `.xml` extension** because `proxy.ts` skips paths
  with an extension, which would drop locale negotiation and break `/ar`.
  `feed`, `category` and `author` are reserved article slugs.
- Pagination: `?page=N`, 12 per page, server-rendered `<a>` links with
  `rel="prev"`/`rel="next"`; domain `paginate(total, page, size)` clamps and
  redirects out-of-range pages to the last page. Canonical for page 1 has no
  query; `noindex` is **not** applied to pages ≥ 2 (they list distinct
  articles).
- Category filter is a link row (path based) so it works without JavaScript
  and has an indexable address.
- Related guides: up to 3 other live articles sharing a category, newest
  first; none shown if none.
- Reading time: `readingMinutes(plainText)` = ceil(words / 200), min 1; words
  counted by Unicode segmentation (`Intl.Segmenter`) so Arabic counts
  correctly. Plain text comes from a new `lexicalToText` in
  `packages/domain/src/content` that also replaces the regex the home page
  uses to build FAQ structured data.
- Feed: `buildRss()` in domain (pure, escapes XML, CDATA-free), latest 20 live
  articles that have **native** text in the requested language (English feed:
  English; Arabic feed: only articles with an Arabic title), `<atom:link
  rel=self>`, absolute URLs from `NEXT_PUBLIC_SITE_URL`, `lastBuildDate` = the
  newest item. `<link rel="alternate" type="application/rss+xml">` is added
  in the guides layouts.
- English fallback marking: queries fetch with `fallbackLocale: false` once to
  learn which articles have native text and render the fallback with a small
  "Available in English" marker (domain `hasNativeText`).

## R12. Intent pages and the brief builder preset

**Decision**: `pages` with `kind = 'intent'` at `/hire/{slug}` (localised slug,
same rules, separate uniqueness scope). Extra fields: `intent.persona`
(relationship `personas`), `intent.specialty` (relationship `categories`),
`intent.location` (relationship `locations`), `intent.presets` (array of
`{ token, value }` for other builder slots such as occasion), `intent.intro`
(localised textarea), `intent.faq` (array: `question`, `answer` richText,
localised), `intent.serviceName` (localised, defaults to the title),
`intent.areaServed` (localised text, defaults to the location name).
The builder gets a new optional prop `preset?: Record<string, string>`
(initial answered values, **changeable**, unlike `locked`). A pure function
`resolvePresets(config, intent)` in `modules/brief/preset.ts` maps the
persona to the persona slot, the specialty and location to the option slots
whose option values equal the specialty/location slug, and merges
`presets`, dropping any `{token, value}` that no longer exists in the live
builder config or whose persona is inactive (spec Story 4 scenario 2). It
returns `{ values, dropped }`; the page uses `values`, the save hook uses
`dropped` to warn (the validation message names each dropped item).
`sourcePath` for the brief is the intent page's address so the brief records
where it came from (already supported by `/book/{code}`).

**Creator strip**: up to six listed creators from `getPublicCreators` filtered
by the intent's persona/specialty/location with the existing
`filterCreators` (feature 002 domain); counts shown only when non-zero via the
existing `getSpecialtyCounts`. Nothing is invented: no creators, no strip.

**Structured data**: `FAQPage` (only when ≥ 1 FAQ item) and `Service`
(`name`, `areaServed`, `provider` = `Organization` from site settings,
`serviceType` = specialty name) built by pure functions in
`packages/domain/src/pages/structured-data.ts` (shared with the home page's FAQ
JSON-LD). All JSON-LD is serialised with `<` escaped (existing pattern).

**Duplicate warning (scenario 5)**: `intentFingerprint(intent)` =
persona|specialty|location|sorted presets; the save hook compares it with
other published intent pages in the same locale and returns a *warning* in
the admin (a `validate` message cannot warn without blocking in Payload), so
the check surfaces as a read-only `ui` field "Similar pages" that lists
matches, and the hook does not block the save. Tested as the pure
fingerprint + a query.

## R13. Structured copy for long-form pages is rendered by one component

**Decision**: a shared `RichContent` server component wraps Payload's
`RichText` with the project's typography (`max-w-[65ch]`, heading scale,
list and quote styles, images with required alt, external links with
`rel="noopener noreferrer"` and `target="_blank"`, internal links through
the locale-aware `Link`). It never renders raw HTML (the lexical converter
does not accept HTML nodes), satisfying FR-015. `RichTextSection` (landing)
is changed to use it so there is one reading style.

## R14. Sitemap, robots, alternates

**Decision**: `app/sitemap.ts` gains entries for visible pages (`hideFromSearch`
false), intent pages, the three legal pages, `/guides`, categories with live
articles, authors with live articles and live articles; entries carry real
per-language alternates (pages have per-language slugs so alternates are
passed explicitly). `robots.ts` also disallows `/next` already; add nothing
else. `app/seo-routes.test.ts` is extended. `alternates()` in
`shared/lib/seo.ts` gets an overload taking `{ en, ar }` paths.

## R15. Design

**Decision**: new surface briefs under `.impeccable/surfaces/`:
`marketing-page.md` (page shell + reading layout), `legal-page.md`,
`guides.md` (listing + article), `intent-page.md`, `not-found.md`. All
inherit "The Brief Bar" (constitution IX); the reading layout is a single
680 px column, no hero imagery, headings as quiet labels; intent pages put the
brief bar first (it **is** the page's one primary action, same as `/book/…`).
Every UI task reads `PRODUCT.md`, the brief, and the impeccable craft floor,
runs the detector, and ends in a finish review (tasks include them).

## R16. What is deliberately not built

Comments, search, newsletters, tags, nested page paths, localised article
slugs, acceptance re-prompts for existing accounts, a studio directory,
Extras/Plus pricing pages (after 004), 410 responses, redirect management UI
(redirects are automatic from renames only).
