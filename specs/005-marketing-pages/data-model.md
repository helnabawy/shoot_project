# Data Model: Marketing, Legal and SEO Pages (005)

One additive migration (`marketing_pages`): seven new collections, one new
site-settings tab, one `users` addition (none: acceptance lives in its own
collection). No backfill, no data loss. Types regenerate into
`payload-types.ts`. "Public" means no sign-in. Editors = `admin` + `editor`
roles; every collection declares access explicitly (default deny).

## `pages` (modules/pages) — drafts enabled

| Field | Type | Notes |
|---|---|---|
| `kind` | select `standard` \| `intent` | default `standard`; sidebar; cannot change after first publish |
| `title` | text, localized, required, ≤ 90 | page heading (`h1`) |
| `slug` | text, localized, required in `en`, ≤ 80 | R2/R4 rules; address `/{slug}` or `/hire/{slug}` by kind |
| `previousSlugs` | array `{locale, slug}`, ≤ 20 | written by hook only (field access: read editors, write nobody) |
| `sections` | blocks = `landingBlocks` | ≥ 1 to publish (hook) |
| `placement` | group | `inHeader` checkbox; `footerGroup` text (must match a site-settings group key, or empty); `navLabel` text localized; `order` number default 100 |
| `seo` | group | `title` ≤ 60, `description` ≤ 160 (both localized), `ogImage` upload `media`, `hideFromSearch` checkbox |
| `intent` | group, shown when `kind = intent` | below |
| `publishedAt`, `publishedBy` | date, relationship | stamped on publish (as `landing-page`) |

`intent` group: `persona` → `personas`; `specialty` → `categories`;
`location` → `locations`; `presets` array `{token, value}` (other builder
slots); `intro` textarea localized ≤ 400; `faq` array `{question text
localized, answer richText localized}`; `serviceName` text localized;
`areaServed` text localized; `similar` (ui field listing duplicate-preset
pages, R12).

**Access**: `read`: public sees `_status = published`; editors all.
`create/update/delete`: editors. `readVersions`: editors.

**Validation / hooks**
- `beforeValidate`: slug shape + reserved + per-`(locale, kind)` uniqueness
  (R2/R4); placement limits (R7); `footerGroup` key exists; intent group
  required fields when `kind = intent` (at least one of persona/specialty/
  location; `faq` items need both parts); reject zero sections on publish.
- `beforeChange`: stamp publish; append old slug to `previousSlugs`; remove a
  matching `removed-paths` row.
- `afterChange` / `afterDelete`: revalidate tags `pages` (+ path); `afterDelete`
  writes `removed-paths` for each locale's slug.

## `removed-paths` (modules/pages)

`kind` (`page` \| `article`), `locale` (`en` \| `ar`), `path` (text, e.g.
`/studios`, unique with locale), `removedAt` (date). **Access**: read public
(only the path is exposed; no content), create/update/delete `nobody` through
the API (hooks use the local API with `overrideAccess`). Cleaned when an
address is reused.

## `legal-documents` (modules/legal)

| Field | Type | Notes |
|---|---|---|
| `kind` | select `terms` \| `professional-terms` \| `privacy`, unique, required | immutable after create |
| `title` | text, localized, required | e.g. "Terms & Conditions" |
| `versions` | array (below) | at most 50 |

`versions[]`: `version` int (hook-assigned: max + 1, read-only), `effectiveFrom`
date (default = publish time), `state` select `draft` \| `published`
(default `draft`), `placeholder` checkbox, `changeSummary` textarea localized,
`body` richText localized, `publishedAt`, `publishedBy` (stamped).

**Access**: `read`: public gets only `state = published` rows (field-level
`read` filters rows in an `afterRead` hook; drafts only for editors);
`create`/`delete`: admin; `update`: editors, but a published row may only be
changed by an admin (hook compares the previous document, FR-018).

**Rules** (domain `legal.ts`, 100 % tested): unique `effectiveFrom` among
published rows; placeholder rows cannot be published; published rows cannot be
removed; `currentVersion(rows, now)`, `upcomingVersion(rows, now)`,
`versionPeriods(rows)` (each published row's `from`–`until`).

## `legal-acceptances` (modules/legal)

`user` → users (required, index), `kind` (same options), `version` int,
`acceptedAt` date, `locale`. **Access**: `create` nobody via API (server action
uses the local API); `read` admin, or the owner's rows; `update` nobody;
`delete` admin (erasure requests). No PII beyond the user relation.

## `articles` (modules/guides) — drafts enabled

| Field | Type | Notes |
|---|---|---|
| `title` | text, localized, required, ≤ 110 | |
| `slug` | text, unique, immutable, required | letters, digits, hyphens; reserved: `feed`, `category`, `author` |
| `summary` | textarea, localized, required, ≤ 220 | listing, feed, meta description fallback |
| `body` | richText, localized, required | |
| `cover` | upload `media`, required to publish | `alt` comes from the media record (required there) |
| `author` | relationship `authors`, required | |
| `categories` | relationship `article-categories`, hasMany | ≥ 1 to publish |
| `publishedAt` | date, required to publish | may be in the future (R3) |
| `seo` | group | `title`, `description` localized; `hideFromSearch` |

**Access**: `read` public → `{_status: published, publishedAt ≤ now}`; editors
all; `create/update/delete` editors; `readVersions` editors. Queries always use
`overrideAccess: false` (R3). `afterDelete` writes a `removed-paths` row.

## `article-categories`, `authors` (modules/guides)

`article-categories`: `slug` (immutable), `name` localized, `description`
localized (optional). `authors`: `slug` (immutable), `name` localized, `bio`
textarea localized, `photo` upload `media` (optional). **Access**: public read;
editors write. **Guards**: deleting a category or author used by any article
is refused with the article titles (same `refuseDeleteWhileReferenced` helper
as personas); empty categories/authors are never listed.

## `site-settings` (edit)

New tab "Footer": `footerGroups` array (max 4): `key` (slug, unique among groups; renaming it
drops its pages from the footer until they are placed again), `label` text
localized, required. Existing access unchanged.

## `landing` (edit)

`modules/landing/index.ts` exports `landingBlocks` and `RenderBlocks`. No
schema change.

## Derived / computed (no storage)

- **In force**: legal `currentVersion(rows, now)`.
- **Live article**: `_status = published ∧ publishedAt ≤ now`.
- **Reading time**: `readingMinutes(lexicalToText(body))`.
- **Has native text**: `hasNativeText(doc, 'title')` for the requested locale.
- **Navigation**: `getNavigation(locale)` = header pages ordered by `order`,
  footer groups with their pages, and the legal links (kinds with a version in
  force).
- **Intent presets**: `resolvePresets(config, intent)` → `{values, dropped}`.

## State transitions

| Entity | States |
|---|---|
| Page / Article | `draft` → `published` → `draft` (unpublish) → deleted (tombstone) |
| Legal version | `draft` → `published` (stamped, immutable for editors) → superseded (derived by date) |
| Removed path | created on delete; removed when the address is reused |

## Access matrix

| Collection | Public | Member | Editor | Admin |
|---|---|---|---|---|
| pages | read published | read published | read/write all | all |
| removed-paths | read | read | read | read (writes by hooks) |
| legal-documents | read published rows | same | edit drafts | all, incl. published rows |
| legal-acceptances | — | read own | — | read, delete |
| articles | read live | read live | all | all |
| article-categories, authors | read | read | write | write |
