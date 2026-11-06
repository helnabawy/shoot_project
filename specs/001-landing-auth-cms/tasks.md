---

description: "Task list for feature 001 — landing page, member accounts, CMS-managed content, persona extensibility"
---

# Tasks: Landing Page, Member Accounts and CMS-Managed Content

**Input**: Design documents from `/specs/001-landing-auth-cms/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Design**: every task that changes visible UI follows the `ui-design` skill and the `impeccable` workflow (context → craft floor → build → detector); each public surface closes with the impeccable finish review (`ship`) and DESIGN.md (Principle IX). The direction (The Brief Bar) and its contract live in `.impeccable/surfaces/apps-web-src-app-site-locale-page-tsx.md`; the approved sketch is `.impeccable/mocks/decision/brief-bar.html`.

**Tests**: REQUIRED by the constitution (Principle III). Every phase lists its
tests first; write them, watch them fail, then implement. Name tests with the
FR/US ids they prove (see `quickstart.md` mapping).

**Organization**: Phases 1–2 build shared infrastructure; Phases 3–10 are one
user story each (US1, US2, US8, US3, US4, US6, US5, US7), in delivery order and
independently testable; Phase 11 is cross-cutting polish. T094 is
intentionally unused.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 landing · US2 WhatsApp · US3 CMS editing · US4 accounts · US5 personas · US6 languages · US7 theme · US8 brief builder
- File paths are relative to the repository root; `apps/web/src` is abbreviated as `web/` below

## Path Conventions

- `apps/web` — Next.js 16 + Payload 3 app (`web/app`, `web/modules`, `web/shared`, `apps/web/tests`)
- `packages/domain` — framework-free rules (`packages/domain/src`)
- `packages/config` — shared tsconfig / eslint / prettier

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, scaffolded app, tooling, test runners and CI skeleton.

- [ ] T001 Create pnpm workspace: root `package.json` (name `shoot-project`, `private`, `engines.node >=24.22.1`, `packageManager pnpm@10.28.0`, scripts `typecheck`, `lint`, `format`, `test`, `test:watch`, `analyze` (`ANALYZE=true next build` in `apps/web` with `@next/bundle-analyzer`), `db:migrate`, `db:migration:create`, `test:unit`, `test:component`, `test:int`, `test:e2e`, `test:coverage`, `seed`, `dev`, `build`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.npmrc` (`auto-install-peers=true`, `strict-peer-dependencies=false`)
- [ ] T002 Scaffold the app with `pnpm dlx create-payload-app@latest -n web -t blank --db postgres --db-connection-string "postgres://shoot:shoot@127.0.0.1:5432/shoot" --use-pnpm --no-agent --no-git --no-deps` run inside `apps/`, then in `apps/web/package.json` pin exact identical versions of `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/ui`, `@payloadcms/translations`, `@payloadcms/storage-s3`, `next`, `react`, `react-dom`; add `@shoot/domain: workspace:*`; run `pnpm install`
- [ ] T003 [P] Create `packages/config/` with `package.json` (`@shoot/config`), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `moduleResolution: bundler`), `eslint.config.js` (typescript-eslint, react, react-hooks, jsx-a11y, import-order, no restricted imports of `next`/`react`/`payload` inside `packages/domain`), `prettier.config.js`
- [ ] T004 [P] Create `packages/domain/` skeleton: `package.json` (`@shoot/domain`, `type: module`, `exports` for `.`, `./auth`, `./contact`, `./personas`, `./content`, `./brief` pointing at `src/*`), `tsconfig.json` extending base, `vitest.config.ts` (node, v8 coverage thresholds 100/95/100/100), empty `src/index.ts`
- [ ] T005 Configure `apps/web/next.config.ts` (`withPayload`, `output: 'standalone'`, `images.formats` avif/webp, `images.remotePatterns` for S3 host from env, security headers) and `apps/web/tsconfig.json` paths (`@/*` → `src/*`, `@payload-config` → `src/payload.config.ts`); verify `import '@shoot/domain'` compiles under Turbopack dev and `next build`, else add `transpilePackages: ['@shoot/domain']` and record in research.md
- [ ] T006 [P] Add `docker-compose.yml` (service `postgres`, image `postgres:17`, port 5432, user/db `shoot`, named volume, `pg_isready` healthcheck) and `apps/web/.env.example` listing every variable from `contracts/routes-and-actions.md`
- [ ] T007 [P] Install Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`, `postcss`), add `apps/web/postcss.config.mjs`, create `web/app/(site)/globals.css` with `@import "tailwindcss"` and tokens (colour roles with ≥ 4.5:1 text pairs, font family, radii, container); ensure it is imported only from `web/app/(site)/[locale]/layout.tsx`; semantic tokens as plain variables (`--ground`, `--ink`, `--panel`, `--panel-action`, `--arrow`, `--attention`, plus support tokens `--muted`, `--hairline`, `--on-panel`, `--focus`) with light values under `:root`, dark values under `.dark` and a `prefers-color-scheme` fallback, mapped once via `@theme inline { --color-ground: var(--ground); … }` (`@theme` must stay top-level), plus `@custom-variant dark (&:where(.dark, .dark *))` and a `:lang(ar)` font-family switch; only logical spacing/position utilities are allowed (lint rule in T083); token roles and values come from the `ui-design` skill (`--ground` #F3F4F1, `--ink` #101614, `--panel` #0B4A3A, `--panel-action` #0E1A2B, `--arrow` #F2B705, `--attention`) with the dark theme switching the ground to ink while panels keep their colours
- [ ] T008 [P] Install Vitest 5 + `@vitejs/plugin-react` + `vite-tsconfig-paths` + `jsdom` + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `@vitest/coverage-v8` + `@testcontainers/postgresql`; write `apps/web/vitest.config.ts` (projects `unit`, `component`, `integration` per testing-strategy skill; coverage thresholds 80) and `apps/web/tests/setup/component.ts` (jest-dom matchers, mocks for `next/navigation`, `next/headers`, `next/cache`)
- [ ] T009 [P] Install Playwright 1.65 + `@axe-core/playwright`; write `apps/web/playwright.config.ts` (projects `mobile` Pixel 7, `desktop` Chrome, `nojs` with `javaScriptEnabled: false`; `webServer` runs `pnpm payload migrate && pnpm seed && pnpm start`; `retries: 0`); `pnpm exec playwright install chromium`; add projects `ar-mobile` (Pixel 7, `locale: 'ar'`, `Accept-Language: ar`) and `dark` (Desktop Chrome, `colorScheme: 'dark'`)
- [ ] T010 [P] Add `lighthouserc.json` (collect `/`, `/login`, `/register` with `startServerCommand`, 3 runs, mobile preset; assert `categories:performance ≥ 0.9`, `categories:accessibility ≥ 0.95`, `largest-contentful-paint ≤ 2500`, `cumulative-layout-shift ≤ 0.1`, `interaction-to-next-paint ≤ 200`, `server-response-time ≤ 800`, `resource-summary:script:size ≤ 204800`, `resource-summary:total:size ≤ 1572864`) and `.github/workflows/ci.yml` (jobs: `quality` = install/typecheck/lint/test:coverage; `e2e` = build + Playwright `@smoke` with a `postgres:17` service and `payload migrate`; `lighthouse` = build + `lhci autorun`); collect `/ar`, `/ar/login`, `/ar/register` as well, and a second collection with dark-scheme emulation (see T091)
- [ ] T011 [P] Align `README.md` and `CLAUDE.md` command sections with the real script names created in T001; add `apps/web/README.md` pointing to the spec
- [ ] T073 [P] Install `next-intl` 4.14+; create `web/i18n/routing.ts` (`defineRouting({ locales: ['en','ar'], defaultLocale: 'en', localePrefix: 'as-needed', localeCookie: { maxAge: 31536000 } })`), `web/i18n/request.ts` (`getRequestConfig` using `next/root-params` `locale()` with `hasLocale` guard, loading `messages/{locale}.json`), `web/i18n/navigation.ts` (`createNavigation(routing)` exporting `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`), `web/proxy.ts` (`export default createMiddleware(routing)` from `next-intl/middleware` with matcher `'/((?!api|admin|next|_next|_vercel|.*\\..*).*)'`), wrap `next.config.ts` with `createNextIntlPlugin()`; create `apps/web/messages/en.json` and `ar.json` skeletons
- [ ] T074 [P] Install `next-themes`; create `web/shared/theme/ThemeProvider.tsx` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, storage key `theme`); confirm the no-flash script is injected before first paint in `next build` output

**Checkpoint**: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (empty suites) and `pnpm --filter web dev` all run; `/admin` shows Payload's first-user screen.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain rules, access/hook/cache helpers, the full CMS schema, seed data and the integration-test harness. No user story can start before this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain package (tests first, 100% coverage)

- [ ] T012 [P] Write `packages/domain/src/contact/whatsapp.test.ts` (FR-010, FR-012: normalise spaces/dashes/parentheses/leading `00`, reject <8 or >15 digits, reject letters, `buildWhatsAppLink` encodes message and strips `+`) then implement `packages/domain/src/contact/whatsapp.ts` (`normaliseE164`, `isE164`, `whatsappNumberSchema`, `buildWhatsAppLink`)
- [ ] T013 [P] Write `packages/domain/src/personas/resolve.test.ts` and `interpolate.test.ts` (FR-027, FR-028, US5-S2: ordering by settings, skips inactive and dangling refs, `{persona.singular}`/`{persona.plural}`/`{personas.list}` "a, b or c"/`{personas.listAnd}`, unknown tokens verbatim, `categoriesForPersonas` filters/sorts) then implement `packages/domain/src/personas/{resolve.ts,interpolate.ts,types.ts}`
- [ ] T014 [P] Write `packages/domain/src/auth/schemas.test.ts` (FR-019…FR-021: name 2–80, email format + lowercase, password ≥ 8, accountType enum, persona required for provider, `isProviderRegistrationValid` rejects inactive persona) then implement `packages/domain/src/auth/schemas.ts` (`registerSchema`, `loginSchema`, `isProviderRegistrationValid`)
- [ ] T015 [P] Write `packages/domain/src/content/placeholders.test.ts` (finds unknown `{...}` tokens, ignores known ones) then implement `packages/domain/src/content/placeholders.ts` (`findUnknownPlaceholders`, `KNOWN_PLACEHOLDERS`); export everything from `packages/domain/src/index.ts`
- [ ] T076 [P] Write `packages/domain/src/personas/conjunctions.test.ts` and extend `interpolate.test.ts` (FR-041: `{ locale: 'ar' }` joins with "أو"/"و", default `en` with "or"/"and", unknown locale falls back to `en`) then implement `packages/domain/src/personas/conjunctions.ts` and the `{ locale }` option of `interpolatePersonaCopy`
- [ ] T092 [P] Write `packages/domain/src/brief/*.test.ts` (FR-046–FR-050: `parseSentence` yields text/token parts in order and flags unknown tokens; `optionsForSlot` filters by persona (empty = all), active and order; `briefSchema(slots)` requires required slots, rejects past dates in `Asia/Dubai`, caps custom text at 80 chars, accepts "any date"; `renderBriefMessage` fills every token in `en`/`ar`; `briefFingerprint` is stable for equal selections; `generateBriefReference` yields short unambiguous codes such as `B-7K4Q2`) then implement `packages/domain/src/brief/{sentence,options,schema,message,fingerprint,reference}.ts`

### Shared app helpers (tests first)

- [ ] T016 [P] Write `web/shared/lib/env.test.ts` then implement `web/shared/lib/env.ts` (zod-validated `DATABASE_URI`, `PAYLOAD_SECRET` ≥ 32 chars, `NEXT_PUBLIC_SITE_URL` url, `PREVIEW_SECRET`, optional S3 group all-or-nothing, optional `SEED_ADMIN_*`); fail fast with a readable message
- [ ] T017 [P] Write `web/shared/payload/access.test.ts` (anonymous/member/admin/editor matrix) then implement `web/shared/payload/access.ts` (`anyone`, `authenticated`, `isAdmin`, `isEditor`, `isAdminOrSelf`)
- [ ] T018 [P] Write `web/shared/payload/hooks/revalidate.test.ts` (calls `revalidateTag(tag, 'max')` / `revalidatePath`, skipped when `context.disableRevalidate`) then implement `web/shared/payload/hooks/revalidate.ts` (`revalidateTagAfterChange(tag)`, `revalidateTagAfterDelete(tag)`, `revalidateLandingPage`) and declare `RequestContext.disableRevalidate` via module augmentation in `web/shared/payload/context.d.ts`
- [ ] T019 [P] Write `web/shared/lib/cache.test.ts` then implement `web/shared/lib/cache.ts` (`cachedQuery(tags, fn)` over `unstable_cache`; `bypass` option used in draft mode) and `web/shared/lib/payload.ts` (`getPayloadClient`); the cache key includes the locale so `en` and `ar` reads are cached separately under the same tag
- [ ] T020 [P] Write `web/shared/payload/fields/slug.test.ts` then implement `web/shared/payload/fields/slug.ts` (`slugField()` — required, unique, indexed, kebab-case validation, read-only in admin once the doc exists, `beforeValidate` rejects changes on update) and `web/shared/payload/fields/cta.ts` (`ctaGroup(name)` with `label`, `kind`, `href`)
- [ ] T077 [P] Write `apps/web/tests/unit/messages.test.ts` (FR-039: `messages/en.json` and `messages/ar.json` have identical key sets, no empty strings, every ICU placeholder present in both) then fill both files with every static UI string: navigation (login, register, account, logout, skip link), form labels and validation/error messages, account page, language switcher, theme toggle (light/dark/system), empty states, 404
- [ ] T078 [P] Write `web/shared/lib/locale.test.ts` then implement `web/shared/lib/locale.ts` (`LOCALES`, `DEFAULT_LOCALE`, `dirFor(locale)`, `isLocale`) and `web/shared/ui/Bidi.tsx` (`<bdi dir="ltr">` wrapper for phone numbers, emails, URLs) with a component test

### Integration harness

- [ ] T021 Create `apps/web/tests/integration/setup/global-setup.ts` (starts `PostgreSqlContainer` from `@testcontainers/postgresql`, sets `DATABASE_URI`, `PAYLOAD_SECRET`, `PAYLOAD_DISABLE_ADMIN`, runs `payload migrate` against it) and `apps/web/tests/integration/setup/payload.ts` (`getTestPayload` with dynamic config import, `resetDatabase`, `createUser({ roles, accountType })`, `asUser`), plus `apps/web/tests/integration/harness.int.test.ts` that boots Payload and asserts the collection and global slugs from data-model.md exist

### CMS schema (depends on T012–T020)

- [ ] T022 [P] Implement `web/modules/media/collections/Media.ts` (upload, `alt` required, image mime only, 10 MB, sizes thumbnail 400 / card 800 / hero 1600 webp, focal point, access read anyone / write isEditor, revalidate `media`); `alt` is `localized: true`
- [ ] T023 [P] Implement `web/modules/personas/collections/Personas.ts` and `Categories.ts` per data-model.md (slugField, `copy` group, `order`, `active`, `personas` ≥ 1 on categories, access read anyone / write isAdmin, revalidate hooks, `beforeDelete` guards that throw a readable `ValidationError` when referenced by users, categories or site-settings); `singular`, `plural`, `description` and `copy.*` are `localized: true` (FR-037); `slug`, `order`, `active`, relationships shared
- [ ] T024 Implement `web/modules/auth/collections/Users.ts` per data-model.md and the payload-cms skill `references/auth.md` (auth options, `roles` with field-level access and `saveToJWT`, `accountType`, `persona` conditional, `categories`, `phone` normalised via domain, `access.admin: isEditor`)
- [ ] T025 Implement `web/modules/site-settings/globals/SiteSettings.ts` (`whatsappNumber` `validate: isE164` + `beforeValidate` normalise, `whatsappDefaultMessage`, `contactEmail`, `social[]`, `activePersonas` ordered relationship, `labels` group, access read anyone / update isAdmin, revalidate `site-settings`); add `logo` (required) and `logoDark` (optional) uploads; `siteName`, `whatsappDefaultMessage` and `labels.*` are `localized: true`; `whatsappNumber` and `activePersonas` shared; add `phoneNumber` (optional E.164, `call` CTA kind) and `briefLimitPerHour` (number, default 5); add `expectedReplyTime` (**L**, FR-059)
- [ ] T026 Implement the eight blocks in `web/modules/landing/blocks/{HowItWorks,Features,CategoriesGrid,PersonaBand,Faq,LogoCloud,RichTextBlock,CallToAction}.ts` (each with `anchor`, `interfaceName`, fields per data-model.md) and `web/modules/landing/globals/LandingPage.ts` (`hero` group, `navigation[]`, `sections` blocks, `seo` group, `versions.drafts`, `beforeValidate` unique-anchor check, `beforeChange` sets `publishedBy`/`publishedAt` on publish, access read anyone / update isEditor / readVersions isEditor, `admin.preview` → `/next/preview`, revalidate `landing-page` + `/`); every leaf text field (hero headline/subheadline/chips/CTA labels, navigation labels, block headings/subheadings/bodies/items/questions/answers/CTA labels, seo title/description) is `localized: true`; `anchor`, `layout`, `source`, images, relationships and the `sections` array itself are shared; `logoCloud.logos[]` gets an optional `imageDark`; add `hero.eyebrow` **L**, `hero.layout` (`briefBuilder` default | `ctas`), CTA `kind: call`, and the `briefBuilder` group per data-model.md (`enabled`, `sentence` **L**, `slots[]` {`token`, `kind`, `optionSet`, `defaultValue`, `placeholder` **L**, `required`, `allowCustom`}, `submitLabel` **L**, `helperText` **L**, `whatsappTemplate` **L**, `successMessage` **L**, `steps[]`) with a `beforeValidate` check that sentence tokens and slots match in every locale
- [ ] T093 [P] Implement `web/modules/brief/collections/OptionSets.ts` (name **L**, immutable slug, `options[]` with label **L**, immutable value unique within the set, order, active, `personas[]`; access read anyone / write isEditor; revalidate `option-sets`; `beforeDelete` refuses while a landing slot references it), `Briefs.ts` (fields per data-model.md including the unique short `reference` generated in `beforeChange` by `packages/domain/src/brief/reference.ts`; a `beforeChange` guard enforcing the honeypot and `site-settings.briefLimitPerHour` per visitor for every write path; `create: anyone`, `read: isAdmin` or `{ member: { equals: user.id } }`, `update: isAdmin` status only, `delete: isAdmin`; admin `defaultColumns`, list filters; indexes on `createdAt`, `status`, `member`, `fingerprint`, unique `reference`) and `RateLimits.ts` (`admin.hidden`, every access operation `() => false`, written only via the Local API with `overrideAccess: true`; unique `key`, `windowStart`; expired windows treated as fresh on read) plus `web/app/api/cron/cleanup/route.ts` deleting rows older than one hour, protected by `Authorization: Bearer $CRON_SECRET` (add `CRON_SECRET` to `env.ts` and `.env.example`)
- [ ] T027 Compose `web/payload.config.ts` (collections Users/Media/Personas/Categories/OptionSets/Briefs/RateLimits, globals SiteSettings/LandingPage, `postgresAdapter({ pool: { connectionString } })` with `push` only in development, `lexicalEditor`, `sharp`, `admin.user: 'users'`, `typescript.outputFile`, `plugins: [s3Storage(...)]` only when S3 env present, `secret` from env); run `pnpm --filter web payload generate:types`; `pnpm typecheck` green
- [ ] T075 Configure localisation and admin i18n in `web/payload.config.ts`: `localization: { locales: [{ code: 'en', label: 'English' }, { code: 'ar', label: 'العربية', rtl: true }], defaultLocale: 'en', fallback: true }`, `i18n: { supportedLanguages: { en, ar }, fallbackLanguage: 'en' }` importing from `@payloadcms/translations/languages/{en,ar}`, `admin.theme: 'all'`; regenerate types; open `/admin`, switch the account language to Arabic and confirm the shell renders `dir="RTL"` (native in Payload 3.93.x) and the account theme toggle works (FR-040, FR-044); note which localised fields keep `required` after checking per-locale enforcement
- [ ] T107 Migrations workflow: after T027 run `pnpm --filter web payload migrate:create initial` and commit `apps/web/src/migrations/`; add root scripts `db:migrate` and `db:migration:create`; add a CI check that fails when the schema differs from the committed migrations (run `payload migrate` on an empty database, then `migrate:create --skip-empty` or equivalent must produce nothing); document "every schema task ends with a migration" in `CLAUDE.md`
- [ ] T028 Write `apps/web/tests/integration/schema.int.test.ts` (FR-012 invalid number rejected + normalised on save; FR-016 member cannot update globals; FR-029 delete refused while referenced; slug immutable; anchors must be unique; draft landing not readable anonymously) — must pass against T022–T027; option-set delete refused while referenced; anonymous cannot read briefs; member reads only own briefs
- [ ] T079 Write `apps/web/tests/integration/localization.int.test.ts` (FR-037/FR-038: save an `ar` hero headline with `locale: 'ar'` and read it back; read `ar` for an untranslated field returns the `en` value; `locale: 'all'` returns `{ en, ar }`; `findUntranslatedFields` lists exactly the empty `ar` leaves; slugs and numbers are identical across locales) then implement `web/shared/payload/localization.ts` (`findUntranslatedFields(docAll, locale)`, `LOCALES` re-export)

### Seed and fixtures

- [ ] T029 Write `apps/web/tests/integration/seed.int.test.ts` (FR-032: running seed twice yields identical counts, one admin, landing page published, all seed copy passes `findUnknownPlaceholders`) then implement `web/shared/payload/seed/{index,admin,personas,categories,option-sets,site-settings,landing-page}.ts` with upsert-by-slug and `context.disableRevalidate`, and the `seed` script in `apps/web/package.json` (`payload run src/shared/payload/seed/index.ts`); seed every localised field in `en` and then in `ar` (`payload.update(..., { locale: 'ar' })`) with the Arabic copy from data-model.md; the idempotency test checks both locales; seed the four option sets (occasions ×19, durations ×5, locations ×8, shot-by ×3) and the six-slot brief builder (landing page `hero.layout: 'briefBuilder'`, `expectedReplyTime` in site settings) with sentence, labels, WhatsApp template and the four step titles/descriptions, in `en` and `ar`
- [ ] T030 [P] Create test fixtures `apps/web/tests/fixtures/{personas,categories,site-settings,landing}.ts` mirroring seed shapes (including a three-persona set with `teacher`) for component tests; each fixture exports `en` and `ar` variants; include `optionSets` and `briefBuilder` fixtures

### App shell

- [ ] T031 [P] Write component tests then implement `web/shared/ui/{Button,Container,Section,Input,Field,FormError}.tsx` (roles, labels, error association via `aria-describedby`, pending state on Button)
- [ ] T102 [P] Bar component kit (FR-061): invoke `impeccable` (read `reference/craft-floor.md` first), then write component tests and implement `web/shared/ui/bar/{BriefBar,BarField,ResultGroup,ResultRow,TopHit,GlyphTile,KeyHint}.tsx` matching `.impeccable/mocks/decision/brief-bar.html` (one floating panel with 14 px corners, 1 px hairline, 20 px blur with an opaque fallback and the system's only shadow; the field at 22 px with a live caret; result rows of 44 px minimum with a 30 px glyph tile on the start side, label, and trailing state or key hint, states open/set/attention; the Top Hit as the one selection-blue row; arrow keys, Return and Escape handled; no-JS form fallback of selects, radio rows and a submit button); logical properties only; verify in en/ar and light/dark; run `impeccable detect --json` on the kit
- [ ] T103 [P] Motion grammar (FR-062): implement once in `web/shared/ui/bar/motion.ts` the row highlight moving between result rows, the live filter (rows leave and arrive with opacity only), the sentence re-composing as a row is set, and the brief-complete reveal on the Top Hit (transform/opacity only, ≤ 200 ms, `motion-safe`), a reduced-motion path with instant state changes, and 100 ms pressed states for rows and the Top Hit; component test for the reduced-motion branch
- [ ] T032 Implement `web/app/(site)/[locale]/layout.tsx` minimal shell (skip link, `<main id="content">`, metadata base from env) and `web/app/(site)/[locale]/not-found.tsx`; implement `web/app/api/health/route.ts` (DB ping) and `web/app/next/{preview,exit-preview}/route.ts` (secret + editor check, `draftMode().enable()`); the layout lives at `web/app/(site)/[locale]/layout.tsx` with `generateStaticParams` over `LOCALES`, `setRequestLocale`, `<html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>`, `ThemeProvider` and `NextIntlClientProvider`; add `apps/web/tests/setup/render.tsx` (`renderWithLocale(ui, { locale, messages })`); the system UI font stack (no font files; Arabic companions come with the platform), tabular figures via `font-variant-numeric`, per research §16

**Checkpoint**: `pnpm test` green (domain 100%, app helpers, harness, schema, seed), `pnpm --filter web seed` populates a local PostgreSQL after `payload migrate`, `/admin` logs in with the seed admin and shows all collections/globals.

---

## Phase 3: User Story 1 — Discover the offer on the landing page (Priority: P1) 🎯 MVP

**Goal**: A fast, responsive single-scroll landing page rendered from CMS content with in-page navigation.

**Independent Test**: Seeded content renders all sections in order at 360 px and 1440 px; anchors navigate without reload; axe clean; Lighthouse ≥ 90.

### Tests for User Story 1 ⚠️ write first, watch them fail

- [ ] T033 [P] [US1] Component tests `web/modules/landing/components/Hero.test.tsx`, `sections/*.test.tsx` (one per block: renders heading/items, interpolates persona copy, exposes `section[id=anchor]` with `h2`), `RenderBlocks.test.tsx` (US1-S5 empty block omitted; unknown blockType ignored)
- [ ] T034 [P] [US1] Component tests `web/shared/components/Header.test.tsx` (mobile toggle `aria-expanded`/`aria-controls`, Escape closes, links from navigation fixture) and `Footer.test.tsx`
- [ ] T035 [P] [US1] Integration test `apps/web/tests/integration/landing-page.int.test.ts` (FR-014 afterChange revalidates `landing-page` tag and `/`; `getLandingPage({ draft: false })` returns published only; `getLandingPage({ draft: true })` returns latest draft)
- [ ] T036 [P] [US1] E2E `apps/web/tests/e2e/us1-landing.spec.ts` tagged `@smoke` (US1-S1 hero text + sections order; US1-S2 nav click → URL `#how-it-works`, no navigation event; US1-S3 `document.scrollingElement.scrollWidth === clientWidth` on mobile; US1-S4 axe no serious/critical; headings outline); FR-057: `brief-submit` visible without scrolling at 360×640

### Implementation for User Story 1

- [ ] T037 [US1] Implement `web/modules/landing/queries.ts` (`getLandingPage` via `cachedQuery(['landing-page'])`, bypass + `draft: true` when `draftMode()` enabled) and `web/modules/site-settings/queries.ts` (`getSiteSettings`); both take `{ locale }` and pass `locale` + `fallbackLocale: 'en'` to the Local API
- [ ] T038 [P] [US1] Implement `web/modules/personas/queries.ts` (`getActivePersonas` = `resolveActivePersonas(settings, personas)`, `getCategoriesForAudience`) with tags `personas`, `categories`, `site-settings`; locale-aware like T037
- [ ] T039 [P] [US1] Implement `web/modules/landing/components/Hero.tsx` (eyebrow/headline/subheadline/trust chips; the default `briefBuilder` layout renders the brief builder slot (wired in T100) with a WhatsApp secondary link, the `ctas` layout renders primary/secondary `CtaLink`s; optional hero image with `next/image` `priority` + `sizes` only when set); built from the sign kit (T102) per the direction contract's FIRST VIEWPORT: ~40 px medium headline with its Arabic line, the brief builder as the green route panel, the midnight action panel directly beneath; brief builder first on every viewport (FR-057)
- [ ] T040 [P] [US1] Implement section components `web/modules/landing/components/sections/{HowItWorks,Features,CategoriesGrid,PersonaBand,Faq,LogoCloud,RichTextBlock,CallToAction}.tsx` (server components; FAQ accordion is a small client child using `<details>`; rich text via `@payloadcms/richtext-lexical/react`) and `RenderBlocks.tsx`; every section uses the bar grammar on the bare ground (how-it-works as three numbered `ResultRow`s, features as a `ResultGroup`, categories as a `ResultGroup`, persona band as a second smaller `BriefBar` with its own `TopHit`, FAQ as expanding `ResultRow`s, closing `TopHit`), at most two panels per page, no stock cards, pills or generic icon tiles (FR-061)
- [ ] T041 [US1] Implement `web/app/(site)/[locale]/page.tsx` (compose Hero + RenderBlocks, `generateMetadata` from `seo`, JSON-LD Organization + FAQPage when FAQ present), `web/app/(site)/sitemap.ts`, `robots.ts`; `generateStaticParams` for both locales, `alternates.languages` (`en`, `ar`, `x-default`) and `openGraph.locale`; JSON-LD in the page language
- [ ] T042 [US1] Implement `web/shared/components/Header.tsx` (logo, nav from `landing-page.navigation`, `MobileMenu` client component, `ActiveSection` IntersectionObserver client component setting `aria-current`) and `Footer.tsx` (site name, social links, legal placeholders); wire both into `(site)/[locale]/layout.tsx`; header and footer render `LocaleSwitcher` and `ThemeToggle` slots (components delivered in US6/US7) and use `Link` from `@/i18n/navigation`
- [ ] T043 [US1] Run `pnpm --filter web build && npx @lhci/cli autorun`; fix any budget violation (bundle analyzer for JS; image `sizes`; font subsetting) until `/` passes all `lighthouserc.json` assertions; run the same for `/ar`; then run `impeccable detect --json` on the landing files and fix mechanical findings

**Checkpoint**: US1 e2e + component + integration green; Lighthouse green on `/`; manual walkthrough step 1 passes.

---

## Phase 4: User Story 2 — Contact the business on WhatsApp (Priority: P1)

**Goal**: Every WhatsApp action opens a chat with the configured number and message; floating button on mobile.

**Independent Test**: With seeded settings, hero CTA, section CTAs and floating button all link to `https://wa.me/971500000000?text=...`; changing the number in the CMS updates links within a minute.

### Tests for User Story 2 ⚠️

- [ ] T044 [P] [US2] Component tests `web/modules/contact/components/WhatsAppButton.test.tsx` (FR-010 href from `buildWhatsAppLink`, `target=_blank` + `rel`, accessible name) and `FloatingWhatsApp.test.tsx` (hidden when no number; `aria-label`)
- [ ] T045 [P] [US2] Integration test `apps/web/tests/integration/site-settings.int.test.ts` (US2-S3 afterChange revalidates `site-settings`; normalised storage; anonymous read includes number; member update denied)
- [ ] T046 [P] [US2] E2E `apps/web/tests/e2e/us2-whatsapp.spec.ts` tagged `@smoke` (US2-S1 hero + floating hrefs match number and encoded message; US2-S2 on `mobile` the floating button is visible after scrolling and does not intersect the submit button on `/register`; `nojs` project: links still work)

### Implementation for User Story 2

- [ ] T047 [US2] Implement `web/modules/contact/components/WhatsAppButton.tsx` (server component; props `number`, `message`, `label`, `variant`) and `FloatingWhatsApp.tsx` (fixed at the bottom end with logical insets, `env(safe-area-inset-bottom)`, hidden on `/admin`, `motion-safe` entrance)
- [ ] T048 [US2] Wire WhatsApp CTAs: the hero's secondary WhatsApp link (brief-builder layout) and `ctas`-layout CTAs, `CallToAction`/`HowItWorks`/`PersonaBand` CTA rendering via a shared `CtaLink` that maps `kind` → `WhatsAppButton` | `Link`; mount `FloatingWhatsApp` in `(site)/[locale]/layout.tsx` with settings from `getSiteSettings`

**Checkpoint**: US2 tests green; manual walkthrough step 2 passes.

---

## Phase 5: User Story 8 — Build a brief in one sentence (Priority: P1)

**Goal**: shootix-style Quick Match step 1: a CMS-defined sentence with selectable words (persona, occasion, date, duration, location, shot by), persona-filtered options, validation, a recorded lead and a WhatsApp hand-off — in both languages, with and without JavaScript.

**Independent Test**: quickstart step 8; `us8-brief.spec.ts` on mobile, `ar-mobile` and `nojs`; `briefs.int.test.ts`.

### Tests for User Story 8 ⚠️

- [ ] T095 [P] [US8] Component tests `web/modules/brief/components/BriefBuilder.test.tsx` (US8-S1 sentence renders text and one labelled control per slot with defaults; US8-S2 changing persona re-filters occasions and clears an invalid selection; US8-S4 submit with missing required slot shows the error on that slot and does not call the action; `allowCustom` slot accepts typed text; unknown token rendered verbatim; `renderWithLocale('ar')` renders Arabic labels RTL) and `MyBriefs.test.tsx`
- [ ] T096 [P] [US8] Integration tests `apps/web/tests/integration/briefs.int.test.ts` (FR-049 anonymous create succeeds and stores selections/labels/locale/sourcePath; FR-050 identical submission within 60 s is not duplicated, 6th anonymous brief in an hour is refused, members are not limited; FR-052 member reads own only, admin reads all and may set status, anonymous read denied; FR-047 option-set persona filtering query; revalidation tag `option-sets`) and extend `landing-page.int.test.ts` (sentence/slot token validation in both locales)
- [ ] T097 [P] [US8] E2E `apps/web/tests/e2e/us8-brief.spec.ts` tagged `@smoke` (US8-S1/S3: pick occasion, date, duration, emirate, submit → `brief-success` visible and the WhatsApp link href contains the rendered sentence; the brief appears via `GET /api/briefs` as admin with the same selections; US8-S5 add an occasion through the admin API → listed after reload; US8-S7 on `ar-mobile` the sentence and options are Arabic; US8-S9 `nojs` submit redirects to `wa.me`; US8-S8 signed-in member sees the brief on `/account`); FR-059: the confirmation shows `brief-reference` and the expected reply time

### Implementation for User Story 8

- [ ] T098 [US8] Implement `web/modules/brief/queries.ts` (`getBriefBuilderConfig(locale)` = `landing-page.briefBuilder` + resolved option sets with persona ids, cached under `landing-page` + `option-sets`; `getMyBriefs(user)`) and `web/modules/brief/actions.ts` (`submitBrief` per `contracts/routes-and-actions.md`: validate against published config, fingerprint dedupe, visitor id cookie (honeypot and rate limit are enforced by the `briefs` hook from T093), create brief with member, build WhatsApp URL, JS/no-JS return paths)
- [ ] T099 [P] [US8] Implement `web/modules/brief/components/{BriefBuilder,BriefSuccess}.tsx` (a `<form>` rendering `parseSentence` parts; each slot a `ResultGroup` of `ResultRow`s whose no-JS baseline is a native `<select>`/`<input list>`/`<input type=date>` with a visible label from messages; client island handles persona-dependent filtering from embedded data and opens WhatsApp in a new tab on success; `useActionState` pending/error states; `data-testid`s from the contract); the sentence is the `BarField` (one segment per slot, re-composed as rows are set), options are the `ResultGroup`s inside the same panel on every viewport, filtered live by what is typed, the submit is the `TopHit` row with the highlight and reveal motion (T103); FR-055/FR-057/FR-058 copy and layout rules apply
- [ ] T100 [US8] Wire the builder into `Hero.tsx` under `hero.layout === 'briefBuilder'` (eyebrow, headline, subheadline, builder, helper text, optional step outline from `briefBuilder.steps` with step 1 active), keep the `ctas` layout as the alternative; add `MyBriefs` to `/account` and the "Call" CTA kind to `CtaLink`; the confirmation (FR-059) is the completed route panel: reference, "we'll reply on WhatsApp", expected reply time from site settings, "Start another brief"
- [ ] T101 [US8] Admin experience for briefs: list columns (persona, date, status, created), filters, `admin.components` CSV export button (or `@payloadcms/plugin-import-export` if it stays within Principle VIII — record the choice in research.md), status change permissions; editor description on the sentence field explaining tokens; "Untranslated" panel covers builder fields

**Checkpoint**: US8 tests green in `mobile`, `ar-mobile`, `nojs`; manual walkthrough step 8 passes; Lighthouse on `/` still within budget with the builder in the hero.

---

## Phase 6: User Story 3 — Edit landing content and the WhatsApp number without a developer (Priority: P2)

**Goal**: Editors change hero, sections, order, images and the number; drafts preview; publish goes live within a minute; non-editors are denied.

**Independent Test**: Through `/admin`, make the four changes in quickstart step 3 and see them on `/` within 60 s; invalid number rejected; draft invisible publicly; member cannot open `/admin`.

### Tests for User Story 3 ⚠️

- [ ] T049 [P] [US3] Integration additions in `apps/web/tests/integration/landing-page.int.test.ts` (FR-015 draft save does not change published read; FR-018 `publishedBy`/`publishedAt` set on publish; FR-016 member update → forbidden) and `apps/web/tests/integration/auth.int.test.ts` (`access.admin` false for member, true for editor/admin)
- [ ] T050 [P] [US3] E2E `apps/web/tests/e2e/us3-cms.spec.ts` (admin logs in at `/admin`; edits hero sub-headline; reorders sections; adds FAQ item; changes number; publishes → `/` reflects all four; US3-S3 invalid number shows error and public link unchanged; US3-S4 draft-only hero change not on `/` but visible via `/next/preview`; US3-S5 member visiting `/admin` is denied)

### Implementation for User Story 3

- [ ] T051 [US3] Admin UX in the landing global and blocks: field `admin.description`s, `labels` for blocks, `admin.components` warning banner on `SiteSettings` when `activePersonas` is empty (`web/modules/site-settings/components/ActivePersonasWarning.tsx`), `hero.headline` `maxLength` 80 with description
- [ ] T052 [US3] Draft preview: `admin.preview` URL on the landing global pointing at `/next/preview?secret=&path=/`; `getLandingPage` bypasses cache under `draftMode()`; add `ExitPreviewBar` client component shown when draft mode is on
- [ ] T053 [US3] Media rendering: `web/shared/components/CmsImage.tsx` wrapping `next/image` with the right size variant (`thumbnail`/`card`/`hero`) and `alt`; use it in Hero, LogoCloud, CategoriesGrid, PersonaBand

**Checkpoint**: US3 tests green; manual walkthrough step 3 passes.

---

## Phase 7: User Story 4 — Register and log in (Priority: P2)

**Goal**: Visitors register as seeker/provider, log in/out, see an account page; lockout, duplicate email and privilege escalation handled.

**Independent Test**: quickstart step 4 and the 7 auth integration scenarios.

### Tests for User Story 4 ⚠️

- [ ] T054 [P] [US4] Integration tests in `apps/web/tests/integration/auth.int.test.ts` (US4-S1 register → member with hashed password not returned; US4-S7 `roles: ['admin']` in body ignored; US4-S3 duplicate email error; US4-S5 lock after 5 failures; `me` with/without token; FR-024 member cannot read another member; provider with inactive persona rejected)
- [ ] T055 [P] [US4] Component tests `web/modules/auth/components/RegisterForm.test.tsx` (field errors from schema, persona select appears for provider with active personas from fixture, provider option hidden when none active, pending disables submit, double submit calls action once) and `LoginForm.test.tsx` (form error rendering, `next` hidden field)
- [ ] T056 [P] [US4] E2E `apps/web/tests/e2e/us4-auth.spec.ts` tagged `@smoke` (register seeker → `/account`; logout → `/account` redirects to `/login?next=/account`; login → back to `/account`; register provider with persona; US4-S5 lockout message; `nojs` project: register and login still work) and `apps/web/tests/e2e/api.spec.ts` (REST contract from `contracts/rest-api.md`)

### Implementation for User Story 4

- [ ] T057 [US4] Implement `web/modules/auth/actions.ts` (`register`, `login`, `logout` per `contracts/routes-and-actions.md`; zod parse; Payload error → safe messages; cookie set/clear; `redirect`)
- [ ] T058 [P] [US4] Implement `web/modules/auth/session.ts` (`getCurrentUser` via `payload.auth({ headers })`, `requireUser(next)` redirecting to `/login?next=`)
- [ ] T059 [P] [US4] Implement `web/modules/personas/components/PersonaSelect.tsx` (labelled `<select>` from active personas, empty state message) and `web/modules/auth/components/{RegisterForm,LoginForm}.tsx` (`useActionState`, `Field`/`FormError` primitives, autocomplete attributes, `aria-describedby` errors, pending state); forms are one `BriefBar` panel of labelled inputs with a `TopHit` submit, ask only the FR-060 fields, and errors are one plain sentence beside the field (FR-058)
- [ ] T060 [US4] Implement routes `web/app/(site)/[locale]/register/page.tsx`, `[locale]/login/page.tsx` (redirect away when signed in; pass active personas), `account/layout.tsx` (guard) and `account/page.tsx` with `web/modules/auth/components/AccountSummary.tsx` (name, email, type, persona, categories, logout form); add Login/Register/Account links to Header based on session (small client island or server read in layout only for `/account`); login/register are one tap from the header and return to `next` (FR-060); the account page lists briefs as completed route panels
- [ ] T061 [US4] Add `apps/web/tests/e2e/fixtures/member.ts` (registers a user once per worker, saves `storageState`) and use it in `us4-auth.spec.ts`

**Checkpoint**: US4 tests green; manual walkthrough step 4 passes; Lighthouse on `/login` and `/register` passes.

---

## Phase 8: User Story 6 — Read and manage the site in Arabic or English (Priority: P2)

**Goal**: The whole public site in Arabic (RTL) and English with a persistent switcher, language negotiation, per-language editing with English fallback, and an Arabic admin interface.

**Independent Test**: quickstart step 6; `us6-i18n.spec.ts` on the `ar-mobile` project; `localization.int.test.ts`.

### Tests for User Story 6 ⚠️

- [ ] T080 [P] [US6] E2E `apps/web/tests/e2e/us6-i18n.spec.ts` tagged `@smoke` (US6-S1 `/ar` has `html[lang=ar][dir=rtl]`, Arabic hero text, Arabic WhatsApp message, no horizontal overflow; US6-S7 phone number inside a `dir=ltr` element and chevrons mirrored; US6-S2 switcher on `/ar#how-it-works` goes to `/#how-it-works` without a navigation reload and sets `NEXT_LOCALE`; US6-S3 first request to `/` with `Accept-Language: ar` redirects to `/ar`, with `en` stays; US6-S8 `link[rel=alternate][hreflang]` for `en`, `ar`, `x-default`; US6-S6 admin account language set to Arabic shows Arabic nav labels)
- [ ] T081 [P] [US6] Component tests: `web/shared/i18n/LocaleSwitcher.test.tsx` (links to the equivalent path in the other locale preserving hash and `?next=`, accessible name in both languages), `web/shared/ui/Bidi.test.tsx`, and `renderWithLocale(..., { locale: 'ar' })` variants of `Hero.test.tsx`, `Faq.test.tsx`, `RegisterForm.test.tsx` asserting Arabic fixture text, `dir="rtl"` container and fallback to English for an untranslated field

### Implementation for User Story 6

- [ ] T082 [US6] Implement `web/shared/i18n/LocaleSwitcher.tsx` (uses `usePathname`/`Link` from `@/i18n/navigation`, keeps `window.location.hash` and search params, `hrefLang`, `aria-label` from messages); mount in Header and Footer
- [ ] T083 [US6] RTL pass over every component: replace physical utilities with logical ones (`ml/mr/pl/pr/left/right/text-left/text-right` → `ms/me/ps/pe/inset-s/inset-e/text-start/text-end`; `start-*`/`end-*` are deprecated since Tailwind 4.2), add an ESLint/`grep` check script `scripts/check-logical-css.sh` run in `pnpm lint`, wrap phone/email/URL text in `Bidi`, mirror directional icons with `rtl:-scale-x-100`, verify forms and the mobile menu at 360 px in Arabic
- [ ] T084 [US6] Per-locale SEO: `generateMetadata` alternates and `openGraph.locale` on every page, `sitemap.ts` entries for both locales with `alternates.languages`, JSON-LD in the page language, `/ar/not-found` translated
- [ ] T085 [US6] Admin translation support: "Untranslated fields" panel on the landing page and site-settings globals (`admin.components.beforeDocumentControls` or a sidebar UI field) using `findUntranslatedFields`; confirm the content locale switcher appears on every localised edit view; complete Arabic seed copy review list in `research.md`
- [ ] T086 [US6] Run Lighthouse CI and axe on `/ar`, `/ar/login`, `/ar/register` (mobile); keep the Arabic font subset within the JS/page-weight budgets; fix regressions

**Checkpoint**: US6 tests green on `ar-mobile`; manual walkthrough step 6 passes; both locales within budget.

---

## Phase 9: User Story 5 — Change the target audience from the CMS (Priority: P3)

**Goal**: Adding/activating/deactivating a persona and its categories updates every audience-dependent surface without code changes; deletion of referenced personas is refused.

**Independent Test**: quickstart step 5; integration test seeding "Teacher".

### Tests for User Story 5 ⚠️

- [ ] T062 [P] [US5] Integration test `apps/web/tests/integration/personas.int.test.ts` (US5-S1 create Teacher + 2 categories + activate → `getActivePersonas` returns 3 in settings order and `getCategoriesForAudience` includes new ones; US5-S3 deactivate → excluded, linked provider user still readable; US5-S4 delete referenced persona → refused; slug change on update → refused; revalidation tags `personas`/`categories` fired)
- [ ] T063 [P] [US5] Component tests with the three-persona fixture: `BriefBuilder.test.tsx` persona slot shows 3 options, `PersonaBand.test.tsx` per-persona and combined layouts interpolate copy, `RegisterForm.test.tsx` provider options = active personas; and `apps/web/tests/unit/seed-copy.test.ts` asserting no seed copy contains unknown placeholders
- [ ] T064 [P] [US5] E2E `apps/web/tests/e2e/us5-personas.spec.ts` tagged `@persona` (admin creates Teacher + categories, activates, publishes → `/` brief-builder persona slot, specialties, persona band and `/register` show Teacher; deactivate Photographer → gone from `/`; delete Videographer → error toast)

### Implementation for User Story 5

- [ ] T065 [US5] Verify and complete persona-agnostic rendering: audit `web/modules/**/components` for literal profession names (grep `photograph|videograph|shooter`) and move any into CMS copy with placeholders; make the brief builder's persona slot and `PersonaSelect` hide themselves when no persona is active
- [ ] T066 [US5] Finalise `beforeDelete` guards and the admin error message text in `Personas.ts`/`Categories.ts`; add `admin.components.beforeList` note on Personas explaining activation via Site Settings

**Checkpoint**: US5 tests green; manual walkthrough step 5 passes; `grep -ri photograph apps/web/src --include=*.tsx` returns nothing outside seed/fixtures.

---

## Phase 10: User Story 7 — Choose a light or dark appearance (Priority: P3)

**Goal**: Correct theme from the first paint, a persistent light/dark/system toggle, contrast-safe tokens in both themes, dark logo variants, and the admin's own theme preference.

**Independent Test**: quickstart step 7; `us7-theme.spec.ts` on the `dark` project; axe in both themes.

### Tests for User Story 7 ⚠️

- [ ] T087 [P] [US7] E2E `apps/web/tests/e2e/us7-theme.spec.ts` tagged `@smoke` (US7-S1 on the `dark` project an `addInitScript` records the first computed `body` background and it equals the dark token, `html.dark` present before hydration; US7-S2 toggle to light persists across reload and navigation to `/login`, "system" returns to device; US7-S3 axe passes in dark on `/`, `/login`, `/register`; US7-S4 admin account theme set to dark renders `[data-theme="dark"]`; `nojs` project: site follows device scheme and no broken toggle is rendered)
- [ ] T088 [P] [US7] Component tests `web/shared/theme/ThemeToggle.test.tsx` (three options with accessible names from messages, `aria-pressed` on the active one, calls `setTheme`), `CmsImage.test.tsx` (renders light and dark variants with `dark:hidden` / `hidden dark:block` when `imageDark` exists, single image otherwise), and `apps/web/tests/unit/contrast.test.ts` (every foreground/background token pair in `globals.css` ≥ 4.5:1 in both themes, large text ≥ 3:1)

### Implementation for User Story 7

- [ ] T089 [US7] Implement `web/shared/theme/ThemeToggle.tsx` (client island, `useTheme` from next-themes, light/dark/system segmented control, hydration-safe placeholder, rendered only when JS is available via `next/dynamic` with `ssr: false` or an `is-js` class) and mount it in Header and Footer
- [ ] T090 [US7] Token audit and dark imagery: list every token pair used for text/controls in `globals.css` with a comment of its contrast ratio; adjust values until `contrast.test.ts` passes; implement dark variants in `CmsImage` (`logoDark`, `logos[].imageDark`) and a light chip fallback for logos without a dark variant
- [ ] T091 [US7] Lighthouse CI dark collection: second `ci.collect` group with `settings.extraHeaders`/`emulatedFormFactor` and `--chrome-flags` for `prefers-color-scheme: dark` (or a `?theme=dark` test-only query handled by the no-flash script in non-production); wire into `ci.yml` matrix; fix regressions

**Checkpoint**: US7 tests green; manual walkthrough step 7 passes; axe and Lighthouse pass in both themes.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Gates, security, deployment shape, docs.

- [ ] T104 Impeccable finish review for the public surfaces (FR-061, SC-016): capture `desktop.png` and `mobile.png` (plus Arabic and dark variants) of `/`, `/login`, `/register`, `/account` into `.impeccable/review/`, run `impeccable detect --json` over the changed UI, spawn the impeccable finish reviewer with the direction contract and the chosen sketch as critique reference, act on its disposition until `ship` (two rounds maximum, then the owner decides)
- [ ] T105 Impeccable documenter: generate `DESIGN.md` and `.impeccable/design.json` from the built world (tokens, sign components, motion, bilingual and theme rules); update the `ui-design` skill to point at DESIGN.md as the token source
- [ ] T106 Usability check (SC-015, SC-017): run the brief task with five first-time participants per language (or the closest available proxy), record completion, attempts and taps in `specs/001-landing-auth-cms/usability.md`, and fix any step where more than one participant hesitated
- [ ] T067 [P] Run `pnpm test:coverage`; add tests until app ≥ 80% statements/branches and domain 100% statements; remove dead code revealed by coverage
- [ ] T068 [P] Security pass: `pnpm audit --prod` clean of high/critical; security headers in `next.config.ts` (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, basic CSP allowing self + S3 host + wa.me navigation); confirm no PII in logs (grep for `console.log` of user objects)
- [ ] T069 [P] Add `apps/web/Dockerfile` (multi-stage, Next standalone, non-root user) and `docker-compose.prod.yml` (`web` ×2 + `postgres`, `payload migrate` as a one-off release step before `web` starts); document and run the FR-033 check from quickstart (two instances, login on one, `/account` on the other)
- [ ] T070 [P] Docs: finalise `README.md`, `CLAUDE.md`, `apps/web/.env.example`; update `research.md` open items with what was confirmed in T005/T002
- [ ] T071 Run the full `quickstart.md` walkthrough and the complete Playwright suite (`pnpm test:e2e` without tag filter) on mobile and desktop; fix findings
- [ ] T072 Run `/speckit-analyze` and resolve any spec/plan/tasks inconsistencies; tick all tasks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately; T002 before T005/T007/T008/T009; T003/T004 parallel with T002
- **Foundational (Phase 2)**: after Phase 1; domain tasks T012–T015 and helpers T016–T020 run in parallel; T021 after T008; T022–T026 after T012–T020; T076 and T092 run with the domain tasks; T093 after T012–T020; T027 after T022–T026 and T093; T075 and T107 after T027; T079 after T075; T028 after T027 and T093; T029 after T027; T030–T032 parallel after T027; T102/T103 after T007 and T031
- **User stories (Phases 3–10)**: all after Phase 2; recommended order US1 → US2 → US8 → US3 → US4 → US6 → US5 → US7; US2 touches Hero (US1) so run after US1; US8 needs US2's WhatsApp link builder and the foundational brief tasks (T092, T093, T026, T029); US3–US5 are independent of each other but US5 e2e assumes US4's register page exists; US6 needs the i18n foundation (T073, T075–T079) and the US1 components; US7 needs T074 and the US1 header
- **Polish (Phase 11)**: after all stories

### User Story Dependencies

- **US1 (P1)**: Foundational only
- **US2 (P1)**: Foundational + Hero/CTA slots from US1 (T039, T040)
- **US3 (P2)**: Foundational + landing queries (T037); e2e assumes US1 renders sections
- **US4 (P2)**: Foundational only (forms + routes); Header links touch T042
- **US5 (P3)**: Foundational + persona-aware components from US1 (T039, T040) and the register form from US4 (T059) for the full check
- **US8 (P1)**: Foundational (T092, T093, T026, T029) + Hero (T039) + WhatsApp (T047); its Arabic and no-JS paths are verified again in US6
- **US6 (P2)**: Foundational (i18n tasks T073, T075–T079, T032) + US1 header/footer/sections; its RTL pass (T083) touches every component, so run it after US1–US4 components exist
- **US7 (P3)**: Foundational (T074, T007) + US1 header; token audit (T090) touches `globals.css` only

### Within Each User Story

- Tests first (component, integration, e2e), confirmed failing
- Queries → components → pages/routes → wiring
- Lighthouse/axe re-run before the checkpoint, in both locales and both themes once US6/US7 exist

---

## Parallel Example: Phase 2 kick-off

```bash
# After Phase 1, launch in parallel (different files, no dependencies):
Task: "T012 domain whatsapp tests + impl"
Task: "T013 domain personas tests + impl"
Task: "T014 domain auth schemas tests + impl"
Task: "T015 domain placeholders tests + impl"
Task: "T016 env.ts tests + impl"
Task: "T017 access.ts tests + impl"
Task: "T018 revalidate hooks tests + impl"
Task: "T019 cache.ts + payload.ts tests + impl"
Task: "T020 slug/cta fields tests + impl"
```

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "T033 landing component tests"
Task: "T034 header/footer component tests"
Task: "T035 landing-page integration test"
Task: "T036 us1-landing e2e"
# Then implementation in parallel where marked [P]:
Task: "T038 personas queries"
Task: "T039 Hero"
Task: "T040 section components + RenderBlocks"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational (the CMS schema, seed and harness are the bulk of the work).
2. Phase 3 US1 → Lighthouse green on `/`.
3. Phase 4 US2 → the site converts via WhatsApp.
4. Phase 5 US8 → the brief builder records leads and hands off to WhatsApp. **Internal MVP** (not releasable: Arabic lands in Phase 8, the theme toggle in Phase 10).

### Incremental Delivery

5. Phase 6 US3 → the owner edits content and the number themselves.
6. Phase 7 US4 → accounts.
7. Phase 8 US6 → Arabic site and admin. **First public release candidate** (bilingual).
8. Phase 9 US5 → audience switch proven end-to-end.
9. Phase 10 US7 → light/dark.
10. Phase 11 → gates, Docker, docs, `/speckit-analyze`.

### Notes

- Keep `payload-types.ts` regenerated after every schema task (T022–T027, T093, T075, T051), each followed by a migration (T107).
- Commit after each task or logical group with Conventional Commits referencing the task id (`feat(landing): T039 hero component`).
- Stop at every checkpoint and run the story's independent test before moving on.

---

## Requirements Traceability (FR → tasks)

| FR | Tasks |
|----|-------|
| FR-001 landing page = hero + ordered sections | T026, T041 |
| FR-002 hero fields from CMS, default "You brief. We shoot." | T026, T029, T039 |
| FR-003 eight editable section types | T026, T040 |
| FR-004 in-page anchors without reload | T026, T036, T042 |
| FR-005 no full reloads between pages | T036, T042, T056, T060 |
| FR-006 360–1440 px without horizontal scroll | T036, T043, T071 |
| FR-007 WCAG 2.1 AA | T031, T036, T043 |
| FR-008 empty sections omitted | T033, T040 |
| FR-009 SEO metadata + sitemap | T041 |
| FR-010 one WhatsApp number everywhere | T012, T044, T047, T048 |
| FR-011 floating WhatsApp button | T046, T047 |
| FR-012 number validated + normalised | T012, T025, T028, T045 |
| FR-013 editors create/edit/reorder/preview/publish | T026, T050, T051, T052 |
| FR-014 live within 60 s, no rebuild | T018, T035, T045, T050 |
| FR-015 drafts never public | T028, T049, T050 |
| FR-016 content area admin/editor only | T017, T024, T049, T050 |
| FR-017 image upload with alt + sizes | T022, T053 |
| FR-018 last published by/at | T026, T049 |
| FR-019 registration fields, provider persona | T014, T054, T057, T059 |
| FR-020 duplicate email rejected | T054, T057 |
| FR-021 password ≥ 8, hashed, never exposed | T014, T024, T054 |
| FR-022 login, persistent session, logout | T024, T056, T057, T058 |
| FR-023 lock after 5 failures for 15 min | T024, T054, T056 |
| FR-024 self-only access, no self-escalation | T017, T024, T054 |
| FR-025 protected pages redirect and return | T056, T058, T060 |
| FR-026 personas/categories as content | T023, T062 |
| FR-027 active persona list drives listings | T013, T025, T038, T063 |
| FR-028 persona placeholders | T013, T015, T063 |
| FR-029 delete refused while referenced | T023, T062, T066 |
| FR-030 audience changes need no code | T062, T064, T065 |
| FR-031 every scenario automated in CI | T010, T067, T072 |
| FR-032 one-command seed | T029, T107 |
| FR-033 stateless, horizontally scalable | T005, T069 |
| FR-034 Arabic site, RTL layout, Arabic typefaces | T007, T032, T080, T083 |
| FR-035 per-language addresses, hreflang | T073, T041, T084 |
| FR-036 switcher, persistence, negotiation | T073, T080, T082 |
| FR-037 every CMS text editable per language | T022, T023, T025, T026, T075, T079 |
| FR-038 English fallback + untranslated indicator | T075, T079, T085 |
| FR-039 translation files complete | T077 |
| FR-040 admin usable in Arabic | T075, T080, T085 |
| FR-041 placeholders in the page language | T076, T081 |
| FR-042 light/dark/system, persistent, no flash | T074, T087, T089 |
| FR-043 contrast in both themes, dark logo variants | T025, T026, T088, T090 |
| FR-044 admin theme preference | T075, T087 |
| FR-045 budgets hold for both languages and themes | T010, T086, T091 |
| FR-046 sentence template with slot kinds | T026, T092, T099, T100 |
| FR-047 option sets in the CMS | T093, T029, T101 |
| FR-048 persona-filtered, ordered options | T092, T095, T098, T099 |
| FR-049 record brief + WhatsApp hand-off | T096, T097, T098 |
| FR-050 validation, dedupe, rate limit | T092, T093, T096, T098 |
| FR-051 editors control sentence, slots, labels, template | T026, T029, T101 |
| FR-052 admin list/filter/export/status; member sees own | T093, T096, T100, T101 |
| FR-053 keyboard, screen reader, no-JS | T095, T097, T099 |
| FR-054 stable brief id for feature 003 | T093, T096 |
| FR-055 brief without account, defaults, one tap | T098, T099, T100 |
| FR-056 one primary action per screen | T102, T039, T059 |
| FR-057 brief builder first, action above the fold | T039, T099, T104 |
| FR-058 plain one-sentence labels and errors | T077, T059, T099 |
| FR-059 confirmation says what happens next | T097, T100 |
| FR-060 minimal auth fields, return to origin | T059, T060 |
| FR-061 follows The Brief Bar, no banned tells | T007, T102, T040, T104, T105 |
| FR-062 immediate feedback, route progress, reduced motion | T103, T099 |
