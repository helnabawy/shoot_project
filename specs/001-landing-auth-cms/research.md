# Research: Landing Page, Member Accounts and CMS-Managed Content

**Date**: 2026-11-06 | **Plan**: [plan.md](plan.md)

Facts below were verified against official sources on 2026-11-06 (Payload
releases and the `v3.93.0` tag, Next.js, Vitest, Tailwind, Playwright and
Lighthouse CI documentation). Items marked *unconfirmed* could not be
verified from official docs and are to be checked during Phase 1 setup.

## 1. Frontend framework: React with Next.js (not Angular)

- **Decision**: React 19 via Next.js 16 App Router.
- **Rationale**: Payload CMS 3 is a Next.js application; it installs into the
  app's `app/(payload)` route group and renders its admin with React Server
  Components. Using Next.js gives site, admin and API in one process, the
  Local API for zero-latency content reads in server components, and
  server-side rendering of the landing page (the only way to hit LCP ≤ 2.5 s
  reliably on mobile). Client-side navigation with `next/link` gives the
  single-page feel the owner asked for.
- **Alternatives considered**: Angular SPA + headless Payload (two deployables,
  client-rendered landing page hurts LCP/SEO, duplicates auth plumbing over
  REST; rejected). Vite + React SPA + headless Payload (same drawbacks minus
  Angular's learning curve; rejected). Next.js Pages Router (Payload 3
  requires App Router; rejected).

## 2. Versions and runtime (verified)

- **Payload**: latest stable **3.93.0** (2026-11-04). Payload 4 is at
  `4.0.0-beta.7` and is not used. `@payloadcms/next@3.93.0` peer-depends on
  `next >=16.3.3 <17` (or specific 15.2/15.3/15.4 patch ranges).
- **Next.js**: latest stable **16.4.5** (2026-11-03). Use 16.4.x.
- **Node**: Payload engines `^22.23.4 || >=24.22.1`. Node 25 is EOL
  (2026-06-01) and not LTS; the development machine currently has Node 25, so
  `.nvmrc` pins **24** (LTS until 2028). Node 26 became LTS on 2026-10-28 and
  also satisfies the range; revisit once Payload's docs list it.
- **pnpm**: template engines `^9 || ^10 || ^11`; the machine has 10.28 ✔.
  pnpm 12 vs the template's `engines` field: *unconfirmed*.
- **Tailwind**: 4.3.5; tokens via `@theme` in CSS, `@tailwindcss/postcss`.
- **Vitest**: 5.1.0; **Playwright**: 1.65; **Lighthouse CI**: `@lhci/cli` 0.16.0.
- **Next 16 breaking changes that affect this plan**: `cookies()`,
  `headers()`, `params`, `searchParams`, `draftMode()` are async only;
  `middleware.ts` is now `proxy.ts` (Node runtime); `revalidateTag(tag, profile)`
  requires the second argument (`'max'`); `next lint` removed (run `eslint`);
  Turbopack is the default bundler; `images.domains` deprecated in favour of
  `remotePatterns`.
- **Pinning rule**: `payload`, `@payloadcms/*`, `next`, `react`, `react-dom`
  pinned exactly and identical across the workspace (Payload troubleshooting
  docs: mismatched copies cause "useUploadHandlers must be used within
  UploadHandlersProvider"). Use `pnpm dedupe` if duplicates appear.

## 3. Payload inside Next.js, one deployable

- **Decision**: Scaffold with
  `pnpm dlx create-payload-app@latest -n web -t blank --db mongodb --db-connection-string "mongodb://127.0.0.1:27017/shoot" --use-pnpm --no-agent --no-git --no-deps`
  inside `apps/`, then move shared config into `packages/config`. The
  `--secret` flag behaviour is *unconfirmed*; set `PAYLOAD_SECRET` in `.env`
  manually.
- **Rationale**: the blank template gives `app/(payload)` with admin + API
  routes, `payload.config.ts`, `withPayload` in `next.config`, and the Users
  and Media collections; everything else is built per `data-model.md`.
- **Alternatives**: the `website` template (ships a Pages collection, header/
  footer globals, search, redirects, form builder, SEO plugin — far more than
  this spec needs and harder to keep within the JS budget; rejected but used
  as a reference for revalidation and block rendering patterns).
- **next.config**: `export default withPayload({ output: 'standalone', images: { formats: ['image/avif','image/webp'], remotePatterns: [...] } })`. `withPayload` already externalises `sharp`, `graphql` and adapters; `transpilePackages` is not needed for `packages/domain` because it is consumed as compiled TypeScript via workspace `exports` pointing at `src` with `tsconfig` paths (verify at setup; fall back to `transpilePackages: ['@shoot/domain']`).

## 4. Rendering, caching and revalidation

- **Decision**: Public pages (`/`, `/login`, `/register`) are server-rendered
  and read CMS data through `cachedQuery(tags, fn)`, a thin wrapper over
  Next's `unstable_cache` with `tags`, exactly as Payload's website template
  does in `getCachedGlobal`. Payload `afterChange`/`afterDelete` hooks call
  `revalidateTag(tag, 'max')` unless `context.disableRevalidate` is set (seed
  and tests). Tags: `landing-page`, `site-settings`, `personas`,
  `categories`, `media`.
- **Rationale**: satisfies FR-014 (visible ≤ 60 s; in practice seconds) with
  no rebuild, keeps TTFB low, and keeps the pages static-like for Lighthouse.
- **Alternatives**: `'use cache'` + `cacheTag` with `cacheComponents` (newer
  Next API; the wrapper isolates a future switch), ISR time-based
  revalidation (up to the interval stale; rejected), `force-dynamic` (TTFB
  and DB load on every request; rejected).
- **Draft preview**: enable `versions: { drafts: true }` on the landing
  global; `/next/preview?secret=…&path=/` enables `draftMode()`; the landing
  query passes `draft: true` when draft mode is on and bypasses the cache.
  Payload's Live Preview panel is a later enhancement.
- **Single-page feel**: `next/link` prefetch + in-page anchors; `scroll-behavior: smooth` with `motion-safe`; the header highlights the current section via `IntersectionObserver` in a small client component.

## 5. Authentication

- **Decision**: Payload local auth on the `users` collection with
  `tokenExpiration: 7 days`, `maxLoginAttempts: 5`, `lockTime: 15 min`,
  `verify: false` (until an email transport is configured), cookies
  `{ sameSite: 'Lax', secure: NODE_ENV==='production' }`. Server actions
  (`register`, `login`, `logout`) call the Local API and set/clear the
  `payload-token` cookie; `getCurrentUser()` uses `payload.auth({ headers })`.
  `access.admin` restricts `/admin` to `roles` containing `admin` or
  `editor`; `roles` has field-level `create/update: isAdmin` so public
  registration cannot escalate.
- **Rationale**: built-in, tested, no extra dependency (Principle VIII);
  satisfies FR-019…FR-025.
- **Alternatives**: NextAuth/Auth.js (second user store or adapter glue;
  rejected), OTP via SMS/email like shootix (needs a provider and cost; out
  of scope, model allows adding a strategy later).
- **REST surface** (auto-generated, kept as the contract for future clients):
  see `contracts/rest-api.md`.

## 6. Persona and category model

- **Decision**: `personas` and `categories` collections; `site-settings.activePersonas`
  (ordered `hasMany` relationship) defines the public audience; `users.accountType`
  (`seeker|provider`) and `users.persona`; copy placeholders
  `{persona.singular}`, `{persona.plural}`, `{personas.list}`, `{personas.listAnd}`
  rendered by `interpolatePersonaCopy` in `packages/domain`. `beforeDelete`
  hooks refuse deletion while referenced (FR-029).
- **Rationale**: a persona becomes a row, not a code path; the integration
  test "seed Teacher → appears everywhere" guards the promise (FR-030).
- **Alternatives**: a `select` field with hardcoded options (requires a
  deploy per persona; rejected), one collection mixing personas and
  categories with a `type` field (confusing admin UX; rejected).

## 7. Landing page content model

- **Decision**: `landing-page` Global: `hero` group, `sections` blocks field
  (8 block types), `navigation` array, `seo` group; `versions.drafts` on.
  Block → React component map in `RenderBlocks.tsx`; rich text via Lexical
  and `@payloadcms/richtext-lexical/react` `RichText`.
- **Rationale**: exactly one landing page exists; a global is simpler for
  editors than a Pages collection and keeps routes trivial.
- **Alternatives**: Pages collection with slugs (needed only when more
  marketing pages appear; can be added without touching the global).

## 8. Testing approach

- **Decision**: Vitest `projects`: `unit` (node), `component` (jsdom + RTL),
  `integration` (node, `globalSetup` starts `MongoMemoryReplSet`,
  `fileParallelism: false`). Playwright runs against `next build && next start`
  with `docker compose` MongoDB seeded by `pnpm seed`; projects `mobile`
  (Pixel 7) and `desktop`; `@axe-core/playwright` on public pages; `@smoke`
  tag for PR runs. Coverage via `@vitest/coverage-v8` with thresholds 80%
  (app) and 100% statements (domain).
- **Rationale**: Principle III; Payload's own repository tests with
  `mongodb-memory-server`, so adapter compatibility is proven. Async server
  components cannot be rendered by RTL (Next docs), so pages are covered by
  e2e and their presentational children by component tests.
- **Alternatives**: Vitest browser mode (optional, not preferred by docs),
  Jest (slower, no ESM comfort), Cypress (second runner; rejected).

## 9. Styling and admin isolation

- **Decision**: Tailwind v4 via `@tailwindcss/postcss`; `globals.css` with
  `@import "tailwindcss"` and `@theme` tokens imported only by the `(site)`
  layout. The `(payload)` route group keeps Payload's own styles
  (`@layer payload-default`). No Tailwind preflight in the admin, per
  Payload's Tailwind-4 guide.
- **Rationale**: avoids the documented preflight conflicts with the admin UI
  and keeps the site CSS tiny.

## 10. Media and statelessness

- **Decision**: `Media` upload collection with `sharp` sizes `thumbnail`
  (400w), `card` (800w), `hero` (1600w), `alt` required. Local disk in
  development; `@payloadcms/storage-s3` in production selected by env.
- **Rationale**: FR-017 and Principle V (no instance-local state).

## 11. Environment, CI and deployment

- **Decision**: `shared/lib/env.ts` validates `DATABASE_URI`, `PAYLOAD_SECRET`,
  `NEXT_PUBLIC_SITE_URL`, `PREVIEW_SECRET`, optional S3 vars and seed admin
  credentials with zod at startup. GitHub Actions `ci.yml`: install → typecheck
  → lint → `vitest run --coverage` (unit+component+integration) → build →
  Playwright `@smoke` with a `mongo` service → `lhci autorun` with
  `lighthouserc.json` assertions (`categories:performance ≥ 0.9`,
  `categories:accessibility ≥ 0.95`, LCP/CLS/INP/TTFB numeric assertions,
  `resource-summary:script:size` ≤ 200 KB).
- **Deployment**: Dockerfile from Next standalone output; works on any
  container host; Vercel also possible (S3 media required there).

## 12. WhatsApp deep link

- **Decision**: `https://wa.me/<E.164 digits without +>?text=<encodeURIComponent(message)>`.
  `normaliseE164` strips spaces, dashes, parentheses, converts a leading `00`
  to `+`, and validates 8–15 digits. Default seeded number is a placeholder
  the owner replaces in Site Settings.

## Open items carried into tasks

- Verify `packages/domain` consumption by Next 16/Turbopack without
  `transpilePackages` (T00x setup task; fall back documented above).
- Confirm `create-payload-app` `--secret` behaviour (set env manually
  regardless).
- Confirm Vitest 5 `projects` + `@vitejs/plugin-react` versions at install.
