---
name: payload-cms
description: How to build and change the Payload CMS 3 layer of this project — collections, globals, fields, blocks (page-builder sections), access control, hooks with Next.js on-demand revalidation, the Local API, media uploads, seed data, generated types, and the auth-enabled Users collection. Use this skill whenever a task touches payload.config.ts, anything under apps/web/src/modules/*/collections|globals|blocks, the /admin panel, the shape of CMS content, the WhatsApp number or other site settings, seeding, or how the site reads content from the CMS — even when the task is phrased as a frontend change that just "needs a new field".
---

# Payload CMS in this project

Payload 3 runs inside the Next.js app in `apps/web`. The admin panel lives at
`/admin`, the REST API at `/api/*`, and server components read content through
the **Local API** (no HTTP). MongoDB is the database. The constitution
(`.specify/memory/constitution.md`) makes two things non-negotiable here:
content and audience definitions are CMS data, never code constants
(Principle IV), and every collection/global declares explicit access with
deny as the default (Principle VII).

## Where things live

```
apps/web/src/
├── payload.config.ts            # composes everything below; keep it thin
├── modules/
│   ├── auth/collections/Users.ts
│   ├── media/collections/Media.ts
│   ├── personas/collections/{Personas,Categories}.ts
│   ├── landing/globals/LandingPage.ts
│   ├── landing/blocks/*.ts      # one file per block (HowItWorks, FAQ, ...)
│   └── site-settings/globals/SiteSettings.ts
├── shared/payload/access.ts     # reusable access functions
├── shared/payload/hooks/revalidate.ts
├── shared/payload/seed/         # idempotent seed scripts
└── payload-types.ts             # GENERATED — never edit by hand
```

A module owns its CMS schema, its React components and its tests. Add a new
content type by creating it inside the module it belongs to and registering it
in `payload.config.ts`; do not create a catch-all `collections/` folder.

## Workflow for any schema change

1. Edit the collection/global/block config.
2. Run `pnpm --filter web payload generate:types` so `payload-types.ts` matches.
   Components and tests import these types; stale types are the most common
   cause of confusing type errors.
3. Update the seed script if the change needs default data.
4. Write or update integration tests for access rules and hooks
   (`references/testing-payload.md`).
5. If the frontend reads the field, update the renderer in the same module.

## Collection skeleton

```ts
// apps/web/src/modules/personas/collections/Personas.ts
import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '@/shared/payload/access'
import { revalidateTag } from '@/shared/payload/hooks/revalidate'

export const Personas: CollectionConfig = {
  slug: 'personas',
  admin: { useAsTitle: 'singular', defaultColumns: ['singular', 'slug', 'active', 'order'] },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  hooks: { afterChange: [revalidateTag('personas')], afterDelete: [revalidateTag('personas')] },
  fields: [
    { name: 'singular', type: 'text', required: true },           // "Photographer"
    { name: 'plural', type: 'text', required: true },             // "Photographers"
    { name: 'slug', type: 'text', required: true, unique: true, index: true,
      admin: { description: 'Stable identifier used in URLs and code. Do not change after launch.' } },
    { name: 'description', type: 'textarea' },
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 100 },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
```

Rules that keep collections healthy:

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
  hooks: { afterChange: [revalidateTag('site-settings')] },
  fields: [
    { name: 'siteName', type: 'text', required: true },
    { name: 'whatsappNumber', type: 'text', required: true,
      validate: (value) => isE164(value) || 'Use international format, e.g. +971581234567',
      admin: { description: 'International format with country code. Used for every WhatsApp button.' } },
    { name: 'whatsappDefaultMessage', type: 'textarea' },
    // social links, contact email, etc.
  ],
}
```

Validation functions for things like phone numbers come from
`packages/domain` so the same rule runs in the admin panel, in the API and in
tests. Never duplicate a regex inside a field config.

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
export const getSiteSettings = cachedQuery(['site-settings'], async () => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'site-settings', depth: 1 })
})
```

- Every read goes through a module `queries.ts` wrapped in `cachedQuery` with
  a cache tag; the matching `afterChange` hook revalidates that tag. This is
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
first admin only if no users exist, then upserts personas, categories, site
settings and the landing page **by slug**, so running it twice is safe. Seed
data is the canonical "default content" for a fresh environment and is what
tests and e2e runs start from. When you change a block or field, update the
seed in the same task.

## Auth

The Users collection is auth-enabled. Registration, login, logout, session
reads and lockout rules are documented in `references/auth.md`; read it
before touching anything under `modules/auth`.

## Gotchas worth knowing before you hit them

- `next.config.ts` must be wrapped with `withPayload(...)`; Payload needs it
  for the admin bundle and server externals.
- Import the config via the `@payload-config` path alias (set in tsconfig);
  relative imports of `payload.config.ts` break the admin build.
- Environment variables `PAYLOAD_SECRET` and `DATABASE_URI` are required at
  import time of the config. Tests set them before dynamically importing it.
- `admin.user` in `payload.config.ts` is the slug of the collection that can
  log into the admin panel. Members and admins share one collection here, so
  `access.admin` on Users must restrict the panel to the `admin` role.
- Enable `versions: { drafts: true }` on the landing page global so editors
  can preview before publishing; frontend reads use `draft: false` unless
  rendering a preview route.
- Versions: this project targets Payload 3.9x (v4 is in beta and not used).
  Payload 3.93 needs Next `>=16.3.3 <17` and Node `^22.23.4 || >=24.22.1`.
  Pin `payload`, `@payloadcms/*`, `next`, `react`, `react-dom` to identical
  exact versions across the workspace; mismatches produce errors such as
  "useUploadHandlers must be used within UploadHandlersProvider". Fix
  duplicates with `pnpm dedupe`.
- Tailwind v4 preflight must not load in the `(payload)` route group: the
  admin has its own stylesheet (`@layer payload-default`), and the site's
  `globals.css` is imported only by the `(site)` layout.

## Reference files

- `references/auth.md` — Users collection, cookies, server actions, REST endpoints, lockout, tests.
- `references/testing-payload.md` — integration test harness with in-memory MongoDB and example tests.
