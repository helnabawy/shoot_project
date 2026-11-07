# Implementation Plan: Marketing, Legal and SEO Pages

**Branch**: `005-marketing-pages` (spec directory; implemented on the current worktree branch) | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-marketing-pages/spec.md`

**Test-id prefix**: ids restart at 001 per feature, so tests are named
`MP-US1-S4`, `MP-FR-003` (MP = marketing pages) next to 001's `FR-004` and
002's `CP-…`.

## Summary

Let editors publish pages without a developer, and add the pages a
trustworthy marketing site must have. Five slices, each shippable alone:

1. **Pages (P1)**: a `pages` collection whose sections are the landing page's
   existing blocks; localised single-segment addresses, drafts and preview,
   header and footer placement, automatic redirects on rename, a "removed"
   notice for deleted pages.
2. **Legal (P1)**: versioned Terms, Professional Terms and Privacy at fixed
   addresses with effective dates, an archive of earlier versions, and an
   acceptance checkbox at registration that records the versions accepted.
3. **Guides (P2)**: articles with authors, categories, scheduling, a
   paginated listing, an RSS feed per language, related guides and structured
   data.
4. **Intent pages (P3)**: `/hire/{slug}` pages that open the brief builder
   with preset answers, show matching creators, an FAQ and `FAQPage` +
   `Service` structured data.
5. **Not found / removed (P3)**: one designed page that distinguishes
   "can't find" from "removed", localised, 404 + `noindex`.

The approach adds **three feature modules** (`pages`, `legal`, `guides`), one
domain folder (`packages/domain/src/pages`) and **no new package**. Rules that
can be pure functions are pure and fully tested in the domain package:
address validation and reserved list, placement limits, legal version-in-force
and invariants, article liveness, pagination, reading time, RSS building,
structured data, intent fingerprints. Scheduling uses time-based
revalidation (`revalidate = 60`) plus tag revalidation, so there is no cron or
job runner (research R3). Page blocks, preview, cache tags, slug helpers,
revalidation hooks, access helpers and the brief builder are reused (R1).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node.js 24 LTS (unchanged).

**Primary Dependencies**: unchanged (Next.js 16.4.3, React 19.2.6, Payload 3.93.0 incl. Lexical, next-intl 4.14.9, next-themes, Tailwind 4.3.5, zod 4.6.7). **No new package.** RSS is built by a tested pure function; reading time uses `Intl.Segmenter`; dates use `Intl.DateTimeFormat`.

**Storage**: PostgreSQL 17 via the Payload adapter. Four small additive migrations, one per story (`marketing_pages_pages`, `_legal`, `_guides`, `_intent`), together adding: `pages` (+ locales, blocks, versions tables, placement/intent groups, `previous_slugs`), `removed_paths`, `legal_documents` (+ versions array, locales), `legal_acceptances`, `articles` (+ versions), `article_categories`, `authors`, site-settings footer tab. No data loss, no backfill.

**Testing**: Vitest (domain unit at 100 %, component, integration against Testcontainers PostgreSQL), Playwright (+ axe) for e2e incl. `nojs` and `ar-mobile` and `dark` projects, Lighthouse CI for the new routes.

**Target Platform**: unchanged (Linux container, evergreen browsers + iOS Safari ≥ 16).

**Project Type**: Web application, existing pnpm monorepo; new modules `apps/web/src/modules/{pages,legal,guides}/`, new domain folder `packages/domain/src/pages/`.

**Performance Goals**: all new public routes meet the landing budgets (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, Lighthouse perf ≥ 90, a11y ≥ 95). All new routes are server components with **0 KB added client JS**, except the register form (one checkbox) and the existing brief builder island on intent pages. Landing JS budget (≤ 200 KB) is unaffected.

**Constraints**: published changes visible ≤ 60 s; scheduled content ≤ 60 s after its time with no editor action; WCAG 2.1 AA; en/ar with English fallback; light/dark; forms, pagination and category filters work without JavaScript; no profession name in code (persona-extensibility); long-form text never rendered as raw HTML; no invented proof in seeds; footer ≤ 4 groups / 24 links, header ≤ 3 pages.

**Scale/Scope**: tens of pages, hundreds of articles. Listing queries paginate in the database (12 per page); the feed reads 20; sitemap reads ids and slugs only. Routes: `/{slug}`, `/terms…`, `/terms/professional…`, `/privacy…`, `/guides`, `/guides/{slug}`, `/guides/category/{slug}`, `/guides/author/{slug}`, `/guides/feed`, `/hire/{slug}` × 2 locales. 7 new collections, 1 settings tab, 0 new blocks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven | Spec exists and was amended first where research found it wrong (410 → removed notice, English-address fallback scenario, article address); no `NEEDS CLARIFICATION` remains | PASS — research R2, R5, R6 |
| II. Performance budgets | Server components, tag + time revalidation, sized images via `CmsImage`, no new client JS on content pages; Lighthouse CI gains eight routes | PASS by design — quickstart CI list |
| III. Test-first | Every scenario mapped to a layer in `quickstart.md`; domain rules pure at 100 %; clock injected for scheduling; `check:scenarios` generalised to the `MP-` prefix | PASS by design |
| IV. Content in CMS | Pages, legal text, articles, footer groups, labels, FAQs, presets are CMS data; reserved routes and block shapes are code (schema), not content; seed is not a fallback (production seed never publishes placeholder legal text) | PASS — data-model, R7, R10 |
| V. Modular monolith | Three modules with `index.ts` exports; landing exports its blocks and renderer; brief gains an optional `preset`; creators read via their `index.ts`; domain stays framework-free | PASS — structure below |
| VI. Responsive, accessible, bilingual, themed | Verified 360/768/1024/1440 × en/ar × light/dark; logical CSS; localized fields; message keys; dates localised | PASS by design — Playwright `ar-mobile` and `dark` projects |
| VII. Secure by default | Explicit access on all seven collections (matrix in data-model); drafts and future-dated articles unreadable by the public at the access layer; acceptances append-only and not creatable over REST; published legal rows immutable for editors; rich text never raw HTML; JSON-LD escaped; preview needs secret + editor session | PASS — data-model access matrix, R3, R8, R9, R13 |
| VIII. Simplicity | No new package; versions are rows not documents; no cron; no menu collection; intent pages reuse `pages` | PASS — 3 justified items below |
| IX. Designed, not generated | Five new surface briefs, impeccable craft floor + detector + finish review per surface; one reading layout; intent page's one primary action is the brief; no invented testimonials, counts or ratings (creator strip and counts are real, hidden at zero) | PASS by design — R15, tasks include shaping, finish review, DESIGN.md update |

**Post-Phase-1 re-check (2026-11-07)**: design adds no service and no package.
Two risks were found and are carried into tasks as spikes rather than assumed:
(1) the `x-pathname` header wiring for the removed notice (R6, fallback
defined), (2) whether the Postgres adapter creates a per-locale unique index
for a localized `slug` (R2; the hook is the contract either way). All gates
pass.

## Project Structure

### Documentation (this feature)

```text
specs/005-marketing-pages/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16, rationale, alternatives
├── data-model.md        # Phase 1: collections, fields, access, states, validation
├── quickstart.md        # Phase 1: setup + walk-through + scenario→test map
├── contracts/
│   └── routes.md        # routes, cache tags, metadata, structured data, sitemap, test ids
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/pages/                 # framework-free, 100 % covered
├── slug.ts              # RESERVED_SLUGS, normaliseSlug, validatePageSlug
├── navigation.ts        # checkPlacementLimits, groupFooter, orderHeader
├── legal.ts             # LEGAL_KINDS, currentVersion, upcomingVersion, versionPeriods, nextVersionNumber, checkVersions
├── articles.ts          # isLive, hasNativeText, paginate, readingMinutes, relatedArticles
├── feed.ts              # buildRss
├── intent.ts            # intentFingerprint, matchesIntent
├── structured-data.ts   # faqJsonLd, serviceJsonLd, articleJsonLd
└── index.ts
packages/domain/src/content/richtext.ts   # lexicalToText (shared by FAQ JSON-LD and reading time)
packages/domain/src/auth/schemas.ts (edit)  # acceptTerms

apps/web/src/
├── app/(site)/[locale]/
│   ├── [slug]/page.tsx                    # standard pages
│   ├── terms/[[...rest]]/page.tsx         # /terms, /terms/versions[/n]
│   ├── terms/professional/[[...rest]]/page.tsx
│   ├── privacy/[[...rest]]/page.tsx
│   ├── guides/page.tsx                    # listing (?page=N)
│   ├── guides/[slug]/page.tsx             # article
│   ├── guides/category/[slug]/page.tsx
│   ├── guides/author/[slug]/page.tsx
│   ├── guides/feed/route.ts               # RSS
│   ├── hire/[slug]/page.tsx               # intent pages
│   └── not-found.tsx (edit)               # removed vs not found
├── app/sitemap.ts (edit)  app/seo-routes.test.ts (edit)
├── proxy.ts (edit)                        # forwards x-pathname
├── modules/pages/
│   ├── collections/{Pages,RemovedPaths}.ts
│   ├── hooks.ts                           # slug rules, previousSlugs, publish stamp, tombstones, revalidate
│   ├── queries.ts                         # getPageBySlug, getNavigation, getIntentPage, isRemovedPath, sitemap lists
│   ├── components/{PageView,IntentView,NotFoundView,Removed}.tsx
│   └── index.ts
├── modules/legal/
│   ├── collections/{LegalDocuments,LegalAcceptances}.ts
│   ├── hooks.ts                           # number versions, immutability, placeholder block, filter rows for public
│   ├── queries.ts                         # getLegalDocument, getLegalForRegistration, getLegalLinks
│   ├── record.ts                          # recordAcceptances(payload, user, kinds, locale)
│   ├── components/{LegalView,VersionList}.tsx
│   └── index.ts
├── modules/guides/
│   ├── collections/{Articles,ArticleCategories,Authors}.ts
│   ├── hooks.ts                           # publish stamp, tombstone, delete guards, revalidate
│   ├── queries.ts                         # listArticles(page, category?, author?), getArticle, related, feed, sitemap lists
│   ├── components/{ArticleCard,ArticleView,Pagination,CategoryNav}.tsx
│   └── index.ts
├── modules/landing/index.ts (new)         # exports landingBlocks, RenderBlocks
├── modules/brief/preset.ts (new)          # resolvePresets
├── modules/brief/components/BriefBuilder.tsx (edit)   # optional `preset` prop
├── modules/auth (edit)                    # RegisterForm checkbox, register action records acceptances
├── modules/site-settings/globals/SiteSettings.ts (edit)  # Footer tab
├── shared/components/{Footer,Header}.tsx (edit)          # page links, legal links
├── shared/ui/RichContent.tsx (new)        # one safe long-form renderer (landing richText section uses it)
├── shared/lib/seo.ts (edit)               # alternates({en, ar})
├── shared/payload/seed/                   # pages.ts, legal.ts, demo-guides.ts
├── migrations/<ts>_marketing_pages.{ts,json}
└── payload.config.ts (edit)               # register collections

apps/web/messages/{en,ar}.json             # pages.*, legal.*, guides.*, intent.*, notFound.* (extended), auth.acceptTerms
apps/web/tests/{integration,e2e,fixtures}  # pages-*, legal-*, guides-*, mp-us1…us5 specs
scripts/check-scenario-tests.mjs (edit)    # prefix read from the quickstart rows
lighthouserc.json (edit)                   # new routes
.impeccable/surfaces/                      # marketing-page, legal-page, guides, intent-page, not-found briefs
```

**Structure Decision**: three modules because the three concerns have
different invariants (editor-built pages, immutable-ish legal versions,
time-gated articles) and different access rules; they share the landing
blocks, the slug helper, the preview route and the revalidation hooks, and
meet only in the layout (`getNavigation`), the sitemap and the register
action. Existing modules are edited only at their seams (landing exports,
brief preset, auth acceptance, site-settings tab).

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| Three new modules instead of one | pages, legal and articles differ in access, lifecycle and routes; one module would mix `legal` immutability with `articles` scheduling | A single `marketing` module grows a 7-collection `collections/` folder with unrelated hooks and makes Principle V's "explicit exports" meaningless |
| `removed-paths` collection | Story 5 / FR-005: a deleted page must show different wording from a never-existing address | Soft-deleting pages (editors expect Delete to delete) or no distinction (violates the spec) |
| `legal-acceptances` collection | FR-007 requires an auditable record of versions accepted, readable per account, append-only | A field on `users` grows every account row and conflicts with self-update access; logs are not queryable by the account |
| `authors` collection | The spec's Author entity is not necessarily a user account (editors write for named people) | Reusing `users` would expose or require accounts for people who never sign in |
| `x-pathname` request header in `proxy.ts` | `not-found.tsx` has no params; it needs the path to look up a tombstone | A DB lookup in the proxy on every request, or turning every dynamic page into a route handler |
