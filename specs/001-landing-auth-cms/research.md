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
  `pnpm dlx create-payload-app@latest -n web -t blank --db postgres --db-connection-string "postgres://shoot:shoot@127.0.0.1:5432/shoot" --use-pnpm --no-agent --no-git --no-deps`
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
  `categories`, `option-sets`, `media`.
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
  `integration` (node, `globalSetup` starts a Testcontainers PostgreSQL and runs migrations,
  `fileParallelism: false`). Playwright runs against `next build && next start`
  with `docker compose` PostgreSQL migrated and seeded by `pnpm seed`; projects `mobile`
  (Pixel 7), `desktop`, `nojs`, `ar-mobile` and `dark`; `@axe-core/playwright` on public pages; `@smoke`
  tag for PR runs. Coverage via `@vitest/coverage-v8` with thresholds 80%
  (app) and 100% statements (domain).
- **Rationale**: Principle III; a real PostgreSQL per test run exercises
  constraints, transactions and the committed migrations exactly as in
  production. Async server
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
  `NEXT_PUBLIC_SITE_URL`, `PREVIEW_SECRET`, `CRON_SECRET`, optional S3 vars and seed admin
  credentials with zod at startup. GitHub Actions `ci.yml`: install → typecheck
  → lint → `vitest run --coverage` (unit+component+integration) → build →
  Playwright `@smoke` with a `postgres` service (after `payload migrate`) → `lhci autorun` with
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

## 13. Localisation: Payload content locales + next-intl for the site (amendment 2026-11-06)

- **Decision**: Payload `localization: { locales: [{ code: 'en', label: 'English' }, { code: 'ar', label: 'العربية', rtl: true }], defaultLocale: 'en', fallback: true }`; every user-visible text field `localized: true` at the leaf level (data-model.md marks them **L**); reads pass `locale` and rely on fallback; the untranslated-fields check reads `locale: 'all'`. Static UI strings and routing use **next-intl 4.14.x** (verified: supports Next 16; `src/proxy.ts` exports `createMiddleware(routing)` from `next-intl/middleware`; `[locale]` segment with `localePrefix: 'as-needed'` so English stays at `/` and Arabic at `/ar`; negotiation order path → cookie → `Accept-Language` → default; the `NEXT_LOCALE` cookie is a session cookie by default, so `localeCookie: { maxAge: 31536000 }` is set to satisfy FR-036; `createNavigation` for `Link`/`redirect`/`usePathname`; locale read via `next/root-params` (Next ≥ 16.3) in `request.ts`; messages in `apps/web/messages/{en,ar}.json`). next-intl has no `dir` helper, so `dirFor(locale)` lives in `shared/lib/locale.ts`. `<html lang dir>` set in the `[locale]` layout; `dir="rtl"` drives CSS logical properties.
- **Rationale**: Payload localisation is built in and editor-friendly (locale switcher in every edit view, per-field fallback); next-intl is the standard App Router i18n library (typed messages, ICU plurals, locale-aware `Link`, negotiation) and avoids hand-rolling cookie/redirect logic that would need its own tests. Leaf-level localisation keeps section order, images and anchors shared, which is what FR-037 asks for.
- **Alternatives**: hand-rolled dictionaries + manual `proxy.ts` (fewer deps but re-implements negotiation, plural rules and typed keys; rejected), `localePrefix: 'always'` (`/en` everywhere; rejected to keep the root English URL), localising whole `blocks` arrays (lets languages diverge structurally and doubles editor work; rejected), separate Arabic landing global (duplicates schema; rejected).
- **Admin** (verified at v3.93.0): `i18n: { supportedLanguages: { en, ar }, fallbackLanguage: 'en' }` with `@payloadcms/translations/languages/{en,ar}` (`ar` ships in the package); editors choose the admin language in their account settings (first visit follows `Accept-Language`). The admin root layout sets `<html dir="RTL">` for `ar`, `fa`, `he` automatically, so FR-040's RTL requirement is native. A locale with `rtl: true` sets `direction: rtl` on localised text inputs; `admin.rtl` overrides per field. The admin theme is `admin.theme: 'all'` (default): per-user light/dark/auto toggle on the account page stored in the `payload-theme` cookie, system detection when unset, `html[data-theme='dark']` for CSS overrides.
- **Fonts** (*superseded by §16: a single family, Readex Pro*): `next/font/google` with a Latin family (`Inter`, variable) and an Arabic family (`Noto_Sans_Arabic` or `Cairo`, both support `weight: 'variable'`, `subsets: ['arabic']`; IBM Plex Sans Arabic needs explicit weights, so it is the fallback choice), exposed as CSS variables `--font-latin` / `--font-arabic` and mapped in `@theme inline`; `font-family` switches under `:lang(ar)`.
- **Persona placeholders**: `interpolatePersonaCopy` takes `{ locale }` for conjunctions (`or`/`and` vs `أو`/`و`); persona names arrive already localised from the query.
- **Bidi**: phone numbers, emails and URLs render inside `<bdi>`/`dir="ltr"` spans; directional icons use `rtl:-scale-x-100` or logical placement.

## 14. Theme: design tokens + next-themes (amendment 2026-11-06)

- **Decision**: Tailwind v4 tokens as plain CSS variables in `globals.css` (`:root { --ground: … }` light values, `.dark { --ground: … }` overrides, plus a `@media (prefers-color-scheme: dark)` fallback for no-JS) mapped once with `@theme inline { --color-ground: var(--ground); … }` (`@theme` itself must be top-level, so the per-theme values cannot live inside it) and `@custom-variant dark (&:where(.dark, .dark *))`; **next-themes** `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, storage key `theme`) provides the inline no-flash script and persistence; `<html suppressHydrationWarning>`; a `ThemeToggle` client island (light / dark / system) in header and footer; hidden without JavaScript (the site then follows `prefers-color-scheme` via the `.dark`-less media fallback in tokens). Payload admin: `admin.theme: 'all'` (default) so editors pick light/dark/auto in their account; custom admin CSS, if any, targets `[data-theme="dark"]`.
- **Rationale**: tokens-with-one-value-per-theme is the only approach that keeps contrast auditable (one table of pairs); next-themes is ~2 KB, solves first-paint flash and system sync correctly, and is the de-facto pattern for App Router.
- **Alternatives**: media-query-only dark mode (no user override; rejected by FR-042), hand-rolled inline script + context (same code, less tested; rejected), per-component colour overrides (unauditable; rejected).
- **Images**: `logoDark` and `logos[].imageDark` optional uploads; `CmsImage` picks the variant by theme using CSS (`dark:hidden` / `hidden dark:block`) so no client JS is needed.
- **Budgets**: both languages and themes are collected by Lighthouse CI (URLs `/`, `/ar`, `/login`, `/ar/login`, `/register`, `/ar/register`; dark via a second collection with `settings.emulatedFormFactor` and `--extra-headers`/`prefers-color-scheme` emulation, see T091). JS budget unchanged (next-intl + next-themes ≈ 15 KB compressed).

## 15. Brief builder: sentence template + option sets (amendment 2026-11-06)

- **Decision**: The hero hosts shootix-style "Quick Match" step 1. The
  sentence is a localised template with `{token}` slots; each slot is a
  definition (`persona` | `options` | `date` | `number`, bound option set,
  default, required, allowCustom). Option sets are a generic collection
  (`option-sets`) with per-option persona filters, so occasions, durations,
  locations and "shot by" are rows, and a teacher audience can add a
  `subjects` set and a `{subject}` slot with no code. Submission is a server
  action: validate against the *published* config, dedupe by fingerprint,
  rate-limit anonymous visitors (database table with a scheduled cleanup, safe across
  instances), create a `briefs` row, then open WhatsApp with the rendered
  message (JS: new tab + inline confirmation; no-JS: redirect).
- **Rationale**: matches the inspiration exactly (verified option lists:
  19 occasions, 1/2/3/4/8 hours, 8 emirates, shot by anyone/woman/man;
  helper text allows free words), keeps every word CMS-owned (Principle IV),
  gives structured leads today and a stable `brief.id` for feature 003's
  matching flow (FR-054).
- **Alternatives**: fixed collections per slot (`occasions`, `locations`)
  — simpler but every new slot is a deploy (rejected); free-text brief
  only — loses structure and persona filtering (rejected); client-only
  WhatsApp link without recording — loses leads (rejected); in-memory rate
  limiting — not safe with two instances (rejected, Principle V).
- **Date slot**: native `<input type="date">` (works without JS), default
  empty = "any date"; validated in `Asia/Dubai`.
- **Rendering**: the sentence is a `<form>` rendered as a `RouteList`; each
  slot is a `RouteLine` whose no-JS baseline is a native `<select>`,
  `<input list>` (when `allowCustom`) or `<input type="date">` with a
  visible label for assistive tech; with JavaScript, options open in a
  `DirectoryList` (desktop) or `BottomSheet` (phone), per §16. Persona change
  re-filters dependent slots client-side from data already in the page (no
  fetch).
- **Reference**: each brief gets a short human-readable `reference` (for
  example `B-7K4Q2`) generated in `beforeChange`, unique, shown on the
  confirmation; the Payload id stays internal.
- **Abuse limits**: honeypot and per-visitor limit live in a `briefs`
  `beforeChange` hook (so REST and the server action are both covered); the
  server action adds fingerprint dedupe and the visitor id cookie.

## 16. Visual direction and design workflow (amendment 2026-11-07)

- **Decision**: "The Brief Bar", a direction the owner pinned: the brief as
  one Spotlight-style search field in a single floating panel, the options
  as grouped result rows beneath it, and the Top Hit row as the one
  primary action. History the same day: the round's assigned "The Shoot
  Pass" was rejected as gimmicky; its runner-up "Bilingual Wayfinding" was
  adopted, then rejected as municipal, cold and too literal; a re-roll
  (seed 0ba1ece0, round 1) dealt The Set Menu, The Credit Line and Dawn
  Cyc, and the owner chose their own Spotlight / Quick Actions direction
  over that hand. Contract in
  `.impeccable/surfaces/apps-web-src-app-site-locale-page-tsx.md`, sketch in
  `.impeccable/mocks/decision/brief-bar.html`, product truth in `PRODUCT.md`.
  Fonts change from research §13's Inter + Noto Sans Arabic to the **system
  UI stack** (SF Pro, Segoe UI, Roboto and their Arabic companions): the
  world's own voice, and zero font bytes on the critical path.
- **Rationale**: a search field is the one interface every phone owner
  already knows, so the sentence needs no instructions; grouped result rows
  keep the whole brief readable in one sweep and give every slot a visible
  state; one panel with one accent reads premium and warm without
  photography, which does not exist yet; the dark rendering (most visits are
  phones at night) is native to the form.
- **Alternatives**: The Shoot Pass and Bilingual Wayfinding (both rejected
  by the owner after review), The Set Menu (the re-roll's assigned
  direction, warm and exact but a restaurant metaphor), The Credit Line
  (editorial credits under an empty plate; needs photography), Dawn Cyc
  (night-to-day bands; stage craft, weak audience fit), the
  category-standard photo hero with serif (looks like shootix and needs
  photos we do not have). Declined catalog challengers each donated one
  discipline, recorded as raises in the contract's FORM block.
- **Risk accepted**: a palette is a tool, so the page can read as an app;
  frosted panels and the system face are common AI-dashboard material. The
  mitigation is in the contract: one panel only (a second, smaller bar for
  the creator invitation at most), the rest of the page on the bare ground,
  no copied Apple icons or glass, craft in the rows, type and rhythm.
- **Workflow**: unchanged; every UI task runs through the `ui-design` skill
  and impeccable's gates (context, craft floor, detector, finish review,
  DESIGN.md written from the built world).

## 17. Database: PostgreSQL instead of MongoDB (amendment 2026-11-07)

- **Decision**: PostgreSQL 17 through `@payloadcms/db-postgres`
  (`postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })`),
  agreed with the owner before any code existed. Development uses schema
  push for fast iteration; every schema change also gets a migration
  (`payload migrate:create <name>`) committed under `apps/web/src/migrations/`,
  and deploys run `payload migrate` (or the adapter's production-migrations
  option) before serving traffic.
- **Rationale**: the roadmap adds quotations, bookings with a state machine,
  payments held until delivery, payouts and reporting (features 003, 004).
  That is relational, money-handling data: foreign keys, constraints and
  transactions prevent orphaned bookings and double payments, and admin
  reporting is plain SQL. Payload supports PostgreSQL as a first-class
  adapter, so the content model in data-model.md is unchanged.
- **Consequences**: localised fields and arrays/blocks become Payload-managed
  side tables (`*_locales`, array tables), invisible to application code;
  `unique`/`index` become real constraints; integration tests use a
  Testcontainers PostgreSQL (Docker required locally and in CI); the
  rate-limit table has no TTL index, so expired rows are removed by a
  protected cron route (`/api/cron/cleanup`, `Authorization: Bearer
  $CRON_SECRET`, called every 15 minutes by the host's scheduler) and
  ignored on read by `windowStart`.
- **Alternatives**: keep MongoDB (no migrations, inline localisation; weaker
  fit for bookings, payments and reporting); SQLite (single-instance, breaks
  Principle V). Hosting: any managed PostgreSQL; choose a UAE or nearby
  region for latency.

## Open items carried into tasks

- Verify `packages/domain` consumption by Next 16/Turbopack without
  `transpilePackages` (T005; fall back documented above).
- Confirm `create-payload-app` `--secret` behaviour (set env manually
  regardless).
- Confirm Vitest 5 `projects` + `@vitejs/plugin-react` versions at install.
- Confirm Lighthouse CI dark-scheme emulation approach (T091).
- Confirm at T075 that `required: true` on a localised field is enforced per
  saved locale (expected; undocumented) and decide which fields keep it.
