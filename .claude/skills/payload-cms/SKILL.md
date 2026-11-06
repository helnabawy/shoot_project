---
name: payload-cms
description: How to build and change the Payload CMS 3 layer of this project (PostgreSQL via Payload's Postgres adapter) — collections, globals, fields, blocks (page-builder sections), access control, hooks with Next.js on-demand revalidation, the Local API, media uploads, seed data, generated types, the auth-enabled Users collection, content localisation (English/Arabic with fallback, `localized` fields, locale-aware reads and seeds), the translated admin UI and the admin light/dark theme. Use this skill whenever a task touches payload.config.ts, anything under apps/web/src/modules/*/collections|globals|blocks, the /admin panel, the shape of CMS content, the WhatsApp number or other site settings, seeding, or how the site reads content from the CMS — even when the task is phrased as a frontend change that just "needs a new field".
---

# Payload CMS in this project

Payload 3 runs inside the Next.js app in `apps/web`. The admin panel lives at
`/admin`, the REST API at `/api/*`, and server components read content through
the **Local API** (no HTTP). PostgreSQL is the database (Payload's Postgres adapter, committed migrations). Content is localised
(`en` default, `ar` with English fallback) and the admin UI is available in
both languages and in light/dark. The constitution
(`.specify/memory/constitution.md`) makes two things non-negotiable here:
content and audience definitions are CMS data, never code constants
(Principle IV), and every collection/global declares explicit access with
deny as the default (Principle VII).

## Where things live

```
apps/web/src/
├── payload.config.ts            # composes everything below; keep it thin
├── migrations/                  # committed Payload migrations (one per schema change)
├── modules/
│   ├── auth/collections/Users.ts
│   ├── media/collections/Media.ts
│   ├── personas/collections/{Personas,Categories}.ts
│   ├── landing/globals/LandingPage.ts   # hero, briefBuilder group (top-level: sentence + slots), sections
│   ├── brief/collections/{OptionSets,Briefs,RateLimits}.ts
│   ├── landing/blocks/*.ts      # one file per block (HowItWorks, FAQ, ...)
│   └── site-settings/globals/SiteSettings.ts
├── shared/payload/access.ts     # reusable access functions
├── shared/payload/fields/{slug,cta}.ts, localization.ts
├── shared/payload/hooks/revalidate.ts
├── shared/payload/seed/         # idempotent seed scripts
└── payload-types.ts             # GENERATED — never edit by hand
```

A module owns its CMS schema, its React components and its tests. Add a new
content type by creating it inside the module it belongs to and registering it
in `payload.config.ts`; do not create a catch-all `collections/` folder.

## Workflow for any schema change

1. Edit the collection/global/block config. In development the Postgres
   adapter pushes the schema automatically so you can iterate.
2. Run `pnpm --filter web payload generate:types` so `payload-types.ts` matches.
   Components and tests import these types; stale types are the most common
   cause of confusing type errors.
3. Create a migration before the task is done:
   `pnpm --filter web payload migrate:create <short-name>` and commit the
   generated file in `src/migrations/`. Review it: renames show up as
   drop + add and would lose data; edit the migration to rename instead.
   Never edit a migration that has already run in any shared environment;
   add a new one.
4. Update the seed script if the change needs default data.
5. Write or update integration tests for access rules and hooks
   (`references/testing-payload.md`); they run the committed migrations.
6. If the frontend reads the field, update the renderer in the same module.

## Collection skeleton

```ts
// apps/web/src/modules/personas/collections/Personas.ts
import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'

export const Personas: CollectionConfig = {
  slug: 'personas',
  admin: { useAsTitle: 'singular', defaultColumns: ['singular', 'slug', 'active', 'order'] },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  hooks: { afterChange: [revalidateTagAfterChange('personas')], afterDelete: [revalidateTagAfterDelete('personas')] },
  fields: [
    { name: 'singular', type: 'text', required: true, localized: true },   // "Photographer" / "مصوّر"
    { name: 'plural', type: 'text', required: true, localized: true },     // "Photographers" / "مصوّرون"
    { name: 'slug', type: 'text', required: true, unique: true, index: true,          // shared across locales
      admin: { description: 'Stable identifier used in URLs and code. Do not change after launch.' } },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 100 },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
```

Rules that keep collections healthy:

- Every field that holds words a visitor or editor reads is
  `localized: true`; identifiers, numbers, booleans, order, relationships
  and uploads are shared. See "Localisation" below for the reasoning.
- Give every collection `access` for all four operations. `read: anyone` is a
  deliberate choice for public content; member data is `isAdminOrSelf`.
- Use `slug` fields (unique, indexed) as the stable key for seed upserts and
  code lookups. Labels change, slugs do not.
- Prefer `select`/`checkbox` with explicit options over free text when the
  frontend branches on the value.
- Add `admin.description` to fields editors might misunderstand; the product
  owner edits this panel without an engineer.
- Reserved field names: `id`, `createdAt`, `updatedAt`, and `_status` (when
  versions are enabled). Do not define them.

## Globals (singletons such as the landing page and site settings)

```ts
// apps/web/src/modules/site-settings/globals/SiteSettings.ts
import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidateTagAfterChange('site-settings')] },
  fields: [
    { name: 'siteName', type: 'text', required: true, localized: true },
    { name: 'whatsappNumber', type: 'text', required: true,
      validate: (value) => isE164(value) || 'Use international format, e.g. +971581234567',
      admin: { description: 'International format with country code. Used for every WhatsApp button.' } },
    { name: 'whatsappDefaultMessage', type: 'textarea', localized: true },
    // social links, contact email, etc.
  ],
}
```

Validation functions for things like phone numbers come from
`packages/domain` so the same rule runs in the admin panel, in the API and in
tests. Never duplicate a regex inside a field config.

## Localisation (English + Arabic)

`payload.config.ts` enables `localization` with locales `en` (default) and
`ar` (`rtl: true`) and `fallback: true`, and `i18n.supportedLanguages`
(`en`, `ar` from `@payloadcms/translations`) for the admin UI. The two are
different things: *localization* is the content's languages; *i18n* is the
language of the admin's menus and labels (each editor picks theirs in their
account).

- Mark leaf text fields `localized: true`: `text`, `textarea`, `richText`,
  and the text fields **inside** arrays, groups and blocks. Do not localise
  a whole `blocks` or `array` field: that lets the two languages diverge
  structurally (different sections, different order), doubles the editor's
  work and breaks the shared anchors. Structure is shared; words differ.
- Treat `required: true` on a localised field as "required in every
  locale an editor saves" (expected behaviour; confirm once in T075). Keep
  `required` for fields that must exist in every language (hero headline);
  rely on fallback for the rest and surface gaps with the untranslated
  panel.
- Reads: pass `locale` and `fallbackLocale: 'en'` (`payload.find({ ..., locale: 'ar', fallbackLocale: 'en' })`);
  an empty Arabic value comes back as the English one. `locale: 'all'`
  returns `{ en: ..., ar: ... }` objects for each localised field and is used
  by `findUntranslatedFields` (`shared/payload/localization.ts`).
- Writes: `payload.update({ ..., locale: 'ar', data })` writes only the
  Arabic values; shared fields can be written from either locale. The seed
  writes English first, then Arabic.
- Generated types describe one locale (strings), because that is what every
  normal read returns; the `'all'` shape is typed locally in the helper.
- Editors see a locale selector in each edit view; the admin language
  selector is in their account, and Payload switches the whole admin to
  `dir="RTL"` for Arabic on its own (no config beyond `supportedLanguages`).
  `admin.theme: 'all'` leaves light/dark/auto to each editor (stored in the
  `payload-theme` cookie); custom admin CSS, if ever needed, targets
  `html[data-theme='dark']`.
- Cache: queries are cached per locale under the same tag, so one
  `revalidateTag('landing-page', 'max')` clears both languages.

## Reading content from server components (Local API)

`cachedQuery` (in `shared/lib/cache.ts`) wraps Next's `unstable_cache` with a
cache tag, the same pattern Payload's official website template uses in
`getCachedGlobal`. Keep the wrapper so a later move to `'use cache'` +
`cacheTag` touches one file.

```ts
// apps/web/src/shared/lib/payload.ts
import { getPayload } from 'payload'
import config from '@payload-config'
export const getPayloadClient = () => getPayload({ config })

// apps/web/src/modules/site-settings/queries.ts
import { cachedQuery } from '@/shared/lib/cache'
export const getSiteSettings = (locale: Locale) =>
  cachedQuery(['site-settings'], { locale }, async () => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'site-settings', depth: 1, locale, fallbackLocale: 'en' })
  })
```

- Every read goes through a module `queries.ts` wrapped in `cachedQuery` with
  a cache tag and the locale; the matching `afterChange` hook revalidates
  that tag (both locales). This is
  what makes "published changes visible within 60 seconds" true without
  rebuilds.
- Pass `depth` explicitly. Relationships come back as IDs at `depth: 0` and as
  populated documents at `depth: 1+`; type guards (`typeof x === 'object'`)
  are needed when the type is a union.
- The Local API bypasses access control by default (`overrideAccess: true`).
  When acting on behalf of a request user (account pages, member actions)
  pass `{ overrideAccess: false, user }` so access rules are enforced.

## Blocks: the landing-page section builder

The landing page global has a `sections` field of type `blocks`. Each block
is a file in `modules/landing/blocks/` exporting a `Block` config, and a React
component with the same name in `modules/landing/components/sections/`.
`RenderBlocks.tsx` maps `blockType` to component. Adding a section type =
block config + component + seed example + component test. Keep blocks
coarse-grained (a whole section), with a `heading`, `subheading`, an array of
items, and at most one CTA group; editors get predictable building blocks and
the renderer stays simple.

Use the Lexical `richText` editor only for genuinely free-form prose (FAQ
answers, legal text). Render it with Payload's `RichText` React component;
never `dangerouslySetInnerHTML` raw HTML.

## Hooks and revalidation

`shared/payload/hooks/revalidate.ts` exports factories that call Next.js
revalidation for a tag or path. On Next 16 `revalidateTag` takes two
arguments: `revalidateTag('personas', 'max')`; the single-argument form is
deprecated. Hooks skip revalidation when
`context.disableRevalidate` is set — seed scripts and tests set it so they do
not touch the Next.js cache. Keep hooks small, synchronous where possible and
free of network calls other than revalidation; slow hooks make the admin
panel feel broken.

## Access control helpers (`shared/payload/access.ts`)

```ts
import type { Access } from 'payload'
export const anyone: Access = () => true
export const authenticated: Access = ({ req }) => Boolean(req.user)
export const isAdmin: Access = ({ req }) => Boolean(req.user?.roles?.includes('admin'))
export const isEditor: Access = ({ req }) =>
  Boolean(req.user?.roles?.some((r) => r === 'admin' || r === 'editor'))
export const isAdminOrSelf: Access = ({ req }) =>
  req.user?.roles?.includes('admin') ? true : req.user ? { id: { equals: req.user.id } } : false
```

Returning a `Where` query (as `isAdminOrSelf` does) filters list results
instead of just allowing/denying; use it for "members see only their own
records". Test every access function from three viewpoints: anonymous,
member, admin.

## Media

`Media` is an upload collection with `sharp` image sizes (thumbnail, card,
hero) and `alt` required. Local disk in development; in production use the
S3-compatible storage adapter configured by environment variables so the web
app stays stateless (constitution Principle V). Always render images through
`next/image` using the generated size URLs.

## Seeding

`pnpm --filter web seed` runs `shared/payload/seed/index.ts`: it creates the
first admin only if no users exist, then upserts personas, categories, option
sets, site settings and the landing page (including the brief builder) **by slug**, so running it twice is safe. Each
seed file holds `en` and `ar` copy; the runner writes English, then updates
with `locale: 'ar'`. Seed
data is the canonical "default content" for a fresh environment and is what
tests and e2e runs start from. When you change a block or field, update the
seed in the same task.

## Brief builder, option sets and briefs

- `landing-page.briefBuilder` (a top-level group next to `hero`) holds the localised sentence and the
  slot definitions; a `beforeValidate` hook checks that `{tokens}` and
  slots match in every locale so editors cannot publish a broken sentence.
- `option-sets` is generic: slug-identified sets with ordered options, each
  option with a stable `value`, localised `label` and `personas[]` filter.
  Values are immutable (briefs store them); labels change freely.
- `briefs` is the lead store: `create: anyone`, guarded by a `beforeChange`
  hook that enforces the honeypot and the per-visitor limit (the
  `rate-limits` table; expired windows reset on read, old rows deleted by
  `/api/cron/cleanup`) for every write path, and generates the short
  `reference`. The server action adds validation against the published
  config, fingerprint dedupe and the member from the session. `read` is admin or own member via
  a `Where` query. Never expose briefs to anonymous reads.
- Option sets revalidate the `option-sets` tag; the builder config is read
  with the landing page and cached per locale.

## Auth

The Users collection is auth-enabled. Registration, login, logout, session
reads and lockout rules are documented in `references/auth.md`; read it
before touching anything under `modules/auth`.

## Gotchas worth knowing before you hit them

- Toggling `localized` on an existing field, renaming a field or changing a
  field type is a destructive migration on PostgreSQL (side tables move).
  Plan the data copy inside the migration and test it on a copy of real data.

- `next.config.ts` must be wrapped with `withPayload(...)`; Payload needs it
  for the admin bundle and server externals.
- Import the config via the `@payload-config` path alias (set in tsconfig);
  relative imports of `payload.config.ts` break the admin build.
- Environment variables `PAYLOAD_SECRET` and `DATABASE_URI` are required at
  import time of the config. Tests set them before dynamically importing it.
- `admin.user` in `payload.config.ts` is the slug of the collection that can
  log into the admin panel. Members and admins share one collection here, so
  `access.admin` on Users must restrict the panel to the `admin` and `editor` roles (`isEditor`, FR-016).
- Enable `versions: { drafts: true }` on the landing page global so editors
  can preview before publishing; frontend reads use `draft: false` unless
  rendering a preview route.
- Versions: this project targets Payload 3.93.x (v4 is in beta and not used).
  Payload 3.93 needs Next `>=16.3.3 <17` and Node `^22.23.4 || >=24.22.1`.
  Pin `payload`, `@payloadcms/*`, `next`, `react`, `react-dom` to identical
  exact versions across the workspace; mismatches produce errors such as
  "useUploadHandlers must be used within UploadHandlersProvider". Fix
  duplicates with `pnpm dedupe`.
- Identifiers (slugs, emails, anchors) stay non-localised so lookups and
  URLs are the same in every language. Payload core exports an
  experimental `slugField()`; our `shared/payload/fields/slug.ts` wraps it
  with the kebab-case validation and immutability guard.
- Tailwind v4 preflight must not load in the `(payload)` route group: the
  admin has its own stylesheet (`@layer payload-default`), and the site's
  `globals.css` is imported only by `(site)/[locale]/layout.tsx`.

## Reference files

- `references/auth.md` — Users collection, cookies, server actions, REST endpoints, lockout, tests.
- `references/testing-payload.md` — integration test harness with a Testcontainers PostgreSQL and example tests.
