---

description: "Task list for feature 001 — landing page, member accounts, CMS-managed content, persona extensibility"
---

# Tasks: Landing Page, Member Accounts and CMS-Managed Content

**Input**: Design documents from `/specs/001-landing-auth-cms/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED by the constitution (Principle III). Every phase lists its
tests first; write them, watch them fail, then implement. Name tests with the
FR/US ids they prove (see `quickstart.md` mapping).

**Organization**: Phases 1–2 build shared infrastructure; Phases 3–7 are one
user story each in priority order and are independently testable; Phase 8 is
cross-cutting polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 landing · US2 WhatsApp · US3 CMS editing · US4 accounts · US5 personas
- File paths are relative to the repository root; `apps/web/src` is abbreviated as `web/` below

## Path Conventions

- `apps/web` — Next.js 16 + Payload 3 app (`web/app`, `web/modules`, `web/shared`, `apps/web/tests`)
- `packages/domain` — framework-free rules (`packages/domain/src`)
- `packages/config` — shared tsconfig / eslint / prettier

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, scaffolded app, tooling, test runners and CI skeleton.

- [ ] T001 Create pnpm workspace: root `package.json` (name `shoot-project`, `private`, `engines.node >=24.22.1`, `packageManager pnpm@10`, scripts `typecheck`, `lint`, `format`, `test`, `test:unit`, `test:component`, `test:int`, `test:e2e`, `test:coverage`, `seed`, `dev`, `build`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.npmrc` (`auto-install-peers=true`, `strict-peer-dependencies=false`)
- [ ] T002 Scaffold the app with `pnpm dlx create-payload-app@latest -n web -t blank --db mongodb --db-connection-string "mongodb://127.0.0.1:27017/shoot" --use-pnpm --no-agent --no-git --no-deps` run inside `apps/`, then in `apps/web/package.json` pin exact identical versions of `payload`, `@payloadcms/next`, `@payloadcms/db-mongodb`, `@payloadcms/richtext-lexical`, `@payloadcms/ui`, `next`, `react`, `react-dom`; add `@shoot/domain: workspace:*`; run `pnpm install`
- [ ] T003 [P] Create `packages/config/` with `package.json` (`@shoot/config`), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `moduleResolution: bundler`), `eslint.config.js` (typescript-eslint, react, react-hooks, jsx-a11y, import-order, no restricted imports of `next`/`react`/`payload` inside `packages/domain`), `prettier.config.js`
- [ ] T004 [P] Create `packages/domain/` skeleton: `package.json` (`@shoot/domain`, `type: module`, `exports` for `.`, `./auth`, `./contact`, `./personas`, `./content` pointing at `src/*`), `tsconfig.json` extending base, `vitest.config.ts` (node, v8 coverage thresholds 100/95/100/100), empty `src/index.ts`
- [ ] T005 Configure `apps/web/next.config.ts` (`withPayload`, `output: 'standalone'`, `images.formats` avif/webp, `images.remotePatterns` for S3 host from env, security headers) and `apps/web/tsconfig.json` paths (`@/*` → `src/*`, `@payload-config` → `src/payload.config.ts`); verify `import '@shoot/domain'` compiles under Turbopack dev and `next build`, else add `transpilePackages: ['@shoot/domain']` and record in research.md
- [ ] T006 [P] Add `docker-compose.yml` (service `mongo`, image `mongo:7`, port 27017, named volume, healthcheck) and `apps/web/.env.example` listing every variable from `contracts/routes-and-actions.md`
- [ ] T007 [P] Install Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`, `postcss`), add `apps/web/postcss.config.mjs`, create `web/app/(site)/globals.css` with `@import "tailwindcss"` and `@theme` tokens (brand colours with ≥ 4.5:1 text pairs, font families, radii, container); ensure it is imported only from `web/app/(site)/layout.tsx`
- [ ] T008 [P] Install Vitest 5 + `@vitejs/plugin-react` + `vite-tsconfig-paths` + `jsdom` + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `@vitest/coverage-v8` + `mongodb-memory-server`; write `apps/web/vitest.config.ts` (projects `unit`, `component`, `integration` per testing-strategy skill; coverage thresholds 80) and `apps/web/tests/setup/component.ts` (jest-dom matchers, mocks for `next/navigation`, `next/headers`, `next/cache`)
- [ ] T009 [P] Install Playwright 1.65 + `@axe-core/playwright`; write `apps/web/playwright.config.ts` (projects `mobile` Pixel 7, `desktop` Chrome, `nojs` with `javaScriptEnabled: false`; `webServer` runs `pnpm seed && pnpm start`; `retries: 0`); `pnpm exec playwright install chromium`
- [ ] T010 [P] Add `lighthouserc.json` (collect `/`, `/login`, `/register` with `startServerCommand`, 3 runs, mobile preset; assert `categories:performance ≥ 0.9`, `categories:accessibility ≥ 0.95`, `largest-contentful-paint ≤ 2500`, `cumulative-layout-shift ≤ 0.1`, `interaction-to-next-paint ≤ 200`, `server-response-time ≤ 800`, `resource-summary:script:size ≤ 204800`, `resource-summary:total:size ≤ 1572864`) and `.github/workflows/ci.yml` (jobs: `quality` = install/typecheck/lint/test:coverage; `e2e` = build + Playwright `@smoke` with `mongo:7` service; `lighthouse` = build + `lhci autorun`)
- [ ] T011 [P] Align `README.md` and `CLAUDE.md` command sections with the real script names created in T001; add `apps/web/README.md` pointing to the spec

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

### Shared app helpers (tests first)

- [ ] T016 [P] Write `web/shared/lib/env.test.ts` then implement `web/shared/lib/env.ts` (zod-validated `DATABASE_URI`, `PAYLOAD_SECRET` ≥ 32 chars, `NEXT_PUBLIC_SITE_URL` url, `PREVIEW_SECRET`, optional S3 group all-or-nothing, optional `SEED_ADMIN_*`); fail fast with a readable message
- [ ] T017 [P] Write `web/shared/payload/access.test.ts` (anonymous/member/admin/editor matrix) then implement `web/shared/payload/access.ts` (`anyone`, `authenticated`, `isAdmin`, `isEditor`, `isAdminOrSelf`)
- [ ] T018 [P] Write `web/shared/payload/hooks/revalidate.test.ts` (calls `revalidateTag(tag, 'max')` / `revalidatePath`, skipped when `context.disableRevalidate`) then implement `web/shared/payload/hooks/revalidate.ts` (`revalidateTagAfterChange(tag)`, `revalidateTagAfterDelete(tag)`, `revalidateLandingPage`) and declare `RequestContext.disableRevalidate` via module augmentation in `web/shared/payload/context.d.ts`
- [ ] T019 [P] Write `web/shared/lib/cache.test.ts` then implement `web/shared/lib/cache.ts` (`cachedQuery(tags, fn)` over `unstable_cache`; `bypass` option used in draft mode) and `web/shared/lib/payload.ts` (`getPayloadClient`)
- [ ] T020 [P] Write `web/shared/payload/fields/slug.test.ts` then implement `web/shared/payload/fields/slug.ts` (`slugField()` — required, unique, indexed, kebab-case validation, read-only in admin once the doc exists, `beforeValidate` rejects changes on update) and `web/shared/payload/fields/cta.ts` (`ctaGroup(name)` with `label`, `kind`, `href`)

### Integration harness

- [ ] T021 Create `apps/web/tests/integration/setup/global-setup.ts` (MongoMemoryReplSet, sets `DATABASE_URI`, `PAYLOAD_SECRET`, `PAYLOAD_DISABLE_ADMIN`) and `apps/web/tests/integration/setup/payload.ts` (`getTestPayload` with dynamic config import, `resetDatabase`, `createUser({ roles, accountType })`, `asUser`), plus `apps/web/tests/integration/harness.int.test.ts` that boots Payload and asserts the collection and global slugs from data-model.md exist

### CMS schema (depends on T012–T020)

- [ ] T022 [P] Implement `web/modules/media/collections/Media.ts` (upload, `alt` required, image mime only, 10 MB, sizes thumbnail 400 / card 800 / hero 1600 webp, focal point, access read anyone / write isEditor, revalidate `media`)
- [ ] T023 [P] Implement `web/modules/personas/collections/Personas.ts` and `Categories.ts` per data-model.md (slugField, `copy` group, `order`, `active`, `personas` ≥ 1 on categories, access read anyone / write isAdmin, revalidate hooks, `beforeDelete` guards that throw a readable `ValidationError` when referenced by users, categories or site-settings)
- [ ] T024 Implement `web/modules/auth/collections/Users.ts` per data-model.md and the payload-cms skill `references/auth.md` (auth options, `roles` with field-level access and `saveToJWT`, `accountType`, `persona` conditional, `categories`, `phone` normalised via domain, `access.admin: isEditor`)
- [ ] T025 Implement `web/modules/site-settings/globals/SiteSettings.ts` (`whatsappNumber` `validate: isE164` + `beforeValidate` normalise, `whatsappDefaultMessage`, `contactEmail`, `social[]`, `activePersonas` ordered relationship, `labels` group, access read anyone / update isAdmin, revalidate `site-settings`)
- [ ] T026 Implement the eight blocks in `web/modules/landing/blocks/{HowItWorks,Features,CategoriesGrid,PersonaBand,Faq,LogoCloud,RichTextBlock,CallToAction}.ts` (each with `anchor`, `interfaceName`, fields per data-model.md) and `web/modules/landing/globals/LandingPage.ts` (`hero` group, `navigation[]`, `sections` blocks, `seo` group, `versions.drafts`, `beforeValidate` unique-anchor check, `beforeChange` sets `publishedBy`/`publishedAt` on publish, access read anyone / update isEditor / readVersions isEditor, `admin.preview` → `/next/preview`, revalidate `landing-page` + `/`)
- [ ] T027 Compose `web/payload.config.ts` (collections Users/Media/Personas/Categories, globals SiteSettings/LandingPage, `mongooseAdapter`, `lexicalEditor`, `sharp`, `admin.user: 'users'`, `typescript.outputFile`, `plugins: [s3Storage(...)]` only when S3 env present, `secret` from env); run `pnpm --filter web payload generate:types`; `pnpm typecheck` green
- [ ] T028 Write `apps/web/tests/integration/schema.int.test.ts` (FR-012 invalid number rejected + normalised on save; FR-016 member cannot update globals; FR-029 delete refused while referenced; slug immutable; anchors must be unique; draft landing not readable anonymously) — must pass against T022–T027

### Seed and fixtures

- [ ] T029 Write `apps/web/tests/integration/seed.int.test.ts` (FR-032: running seed twice yields identical counts, one admin, landing page published, all seed copy passes `findUnknownPlaceholders`) then implement `web/shared/payload/seed/{index,admin,personas,categories,site-settings,landing-page}.ts` with upsert-by-slug and `context.disableRevalidate`, and the `seed` script in `apps/web/package.json` (`payload run src/shared/payload/seed/index.ts`)
- [ ] T030 [P] Create test fixtures `apps/web/tests/fixtures/{personas,categories,site-settings,landing}.ts` mirroring seed shapes (including a three-persona set with `teacher`) for component tests

### App shell

- [ ] T031 [P] Write component tests then implement `web/shared/ui/{Button,Container,Section,Input,Field,FormError}.tsx` (roles, labels, error association via `aria-describedby`, pending state on Button)
- [ ] T032 Implement `web/app/(site)/layout.tsx` minimal shell (`next/font` two families, skip link, `<main id="content">`, metadata base from env) and `web/app/(site)/not-found.tsx`; implement `web/app/api/health/route.ts` (DB ping) and `web/app/next/{preview,exit-preview}/route.ts` (secret + editor check, `draftMode().enable()`)

**Checkpoint**: `pnpm test` green (domain 100%, app helpers, harness, schema, seed), `pnpm --filter web seed` populates a local Mongo, `/admin` logs in with the seed admin and shows all collections/globals.

---

## Phase 3: User Story 1 — Discover the offer on the landing page (Priority: P1) 🎯 MVP

**Goal**: A fast, responsive single-scroll landing page rendered from CMS content with in-page navigation.

**Independent Test**: Seeded content renders all sections in order at 360 px and 1440 px; anchors navigate without reload; axe clean; Lighthouse ≥ 90.

### Tests for User Story 1 ⚠️ write first, watch them fail

- [ ] T033 [P] [US1] Component tests `web/modules/landing/components/Hero.test.tsx`, `sections/*.test.tsx` (one per block: renders heading/items, interpolates persona copy, exposes `section[id=anchor]` with `h2`), `RenderBlocks.test.tsx` (US1-S5 empty block omitted; unknown blockType ignored)
- [ ] T034 [P] [US1] Component tests `web/shared/components/Header.test.tsx` (mobile toggle `aria-expanded`/`aria-controls`, Escape closes, links from navigation fixture) and `Footer.test.tsx`
- [ ] T035 [P] [US1] Integration test `apps/web/tests/integration/landing-page.int.test.ts` (FR-014 afterChange revalidates `landing-page` tag and `/`; `getLandingPage({ draft: false })` returns published only; `getLandingPage({ draft: true })` returns latest draft)
- [ ] T036 [P] [US1] E2E `apps/web/tests/e2e/us1-landing.spec.ts` tagged `@smoke` (US1-S1 hero text + sections order; US1-S2 nav click → URL `#how-it-works`, no navigation event; US1-S3 `document.scrollingElement.scrollWidth === clientWidth` on mobile; US1-S4 axe no serious/critical; headings outline)

### Implementation for User Story 1

- [ ] T037 [US1] Implement `web/modules/landing/queries.ts` (`getLandingPage` via `cachedQuery(['landing-page'])`, bypass + `draft: true` when `draftMode()` enabled) and `web/modules/site-settings/queries.ts` (`getSiteSettings`)
- [ ] T038 [P] [US1] Implement `web/modules/personas/queries.ts` (`getActivePersonas` = `resolveActivePersonas(settings, personas)`, `getCategoriesForAudience`) with tags `personas`, `categories`, `site-settings`
- [ ] T039 [P] [US1] Implement `web/modules/landing/components/Hero.tsx` (headline/subheadline/trust chips, `next/image` `priority` + `sizes`, mobile image variant, primary CTA slot, secondary CTA slot with `PersonaSelector` client island reading active personas)
- [ ] T040 [P] [US1] Implement section components `web/modules/landing/components/sections/{HowItWorks,Features,CategoriesGrid,PersonaBand,Faq,LogoCloud,RichTextBlock,CallToAction}.tsx` (server components; FAQ accordion is a small client child using `<details>`; rich text via `@payloadcms/richtext-lexical/react`) and `RenderBlocks.tsx`
- [ ] T041 [US1] Implement `web/app/(site)/page.tsx` (compose Hero + RenderBlocks, `generateMetadata` from `seo`, JSON-LD Organization + FAQPage when FAQ present), `web/app/(site)/sitemap.ts`, `robots.ts`
- [ ] T042 [US1] Implement `web/shared/components/Header.tsx` (logo, nav from `landing-page.navigation`, `MobileMenu` client component, `ActiveSection` IntersectionObserver client component setting `aria-current`) and `Footer.tsx` (site name, social links, legal placeholders); wire both into `(site)/layout.tsx`
- [ ] T043 [US1] Run `pnpm --filter web build && npx @lhci/cli autorun`; fix any budget violation (bundle analyzer for JS; image `sizes`; font subsetting) until `/` passes all `lighthouserc.json` assertions

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

- [ ] T047 [US2] Implement `web/modules/contact/components/WhatsAppButton.tsx` (server component; props `number`, `message`, `label`, `variant`) and `FloatingWhatsApp.tsx` (fixed bottom-right, `env(safe-area-inset-bottom)`, hidden on `/admin`, `motion-safe` entrance)
- [ ] T048 [US2] Wire WhatsApp CTAs: Hero primary CTA (`kind: whatsapp`), `CallToAction`/`HowItWorks`/`PersonaBand` CTA rendering via a shared `CtaLink` that maps `kind` → `WhatsAppButton` | `Link`; mount `FloatingWhatsApp` in `(site)/layout.tsx` with settings from `getSiteSettings`

**Checkpoint**: US2 tests green; manual walkthrough step 2 passes.

---

## Phase 5: User Story 3 — Edit landing content and the WhatsApp number without a developer (Priority: P2)

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

## Phase 6: User Story 4 — Register and log in (Priority: P2)

**Goal**: Visitors register as seeker/provider, log in/out, see an account page; lockout, duplicate email and privilege escalation handled.

**Independent Test**: quickstart step 4 and the 7 auth integration scenarios.

### Tests for User Story 4 ⚠️

- [ ] T054 [P] [US4] Integration tests in `apps/web/tests/integration/auth.int.test.ts` (US4-S1 register → member with hashed password not returned; US4-S7 `roles: ['admin']` in body ignored; US4-S3 duplicate email error; US4-S5 lock after 5 failures; `me` with/without token; FR-024 member cannot read another member; provider with inactive persona rejected)
- [ ] T055 [P] [US4] Component tests `web/modules/auth/components/RegisterForm.test.tsx` (field errors from schema, persona select appears for provider with active personas from fixture, provider option hidden when none active, pending disables submit, double submit calls action once) and `LoginForm.test.tsx` (form error rendering, `next` hidden field)
- [ ] T056 [P] [US4] E2E `apps/web/tests/e2e/us4-auth.spec.ts` tagged `@smoke` (register seeker → `/account`; logout → `/account` redirects to `/login?next=/account`; login → back to `/account`; register provider with persona; US4-S5 lockout message; `nojs` project: register and login still work) and `apps/web/tests/e2e/api.spec.ts` (REST contract from `contracts/rest-api.md`)

### Implementation for User Story 4

- [ ] T057 [US4] Implement `web/modules/auth/actions.ts` (`register`, `login`, `logout` per `contracts/routes-and-actions.md`; zod parse; Payload error → safe messages; cookie set/clear; `redirect`)
- [ ] T058 [P] [US4] Implement `web/modules/auth/session.ts` (`getCurrentUser` via `payload.auth({ headers })`, `requireUser(next)` redirecting to `/login?next=`)
- [ ] T059 [P] [US4] Implement `web/modules/personas/components/PersonaSelect.tsx` (labelled `<select>` from active personas, empty state message) and `web/modules/auth/components/{RegisterForm,LoginForm}.tsx` (`useActionState`, `Field`/`FormError` primitives, autocomplete attributes, `aria-describedby` errors, pending state)
- [ ] T060 [US4] Implement routes `web/app/(site)/register/page.tsx`, `login/page.tsx` (redirect away when signed in; pass active personas), `account/layout.tsx` (guard) and `account/page.tsx` with `web/modules/auth/components/AccountSummary.tsx` (name, email, type, persona, categories, logout form); add Login/Register/Account links to Header based on session (small client island or server read in layout only for `/account`)
- [ ] T061 [US4] Add `apps/web/tests/e2e/fixtures/member.ts` (registers a user once per worker, saves `storageState`) and use it in `us4-auth.spec.ts`

**Checkpoint**: US4 tests green; manual walkthrough step 4 passes; Lighthouse on `/login` and `/register` passes.

---

## Phase 7: User Story 5 — Change the target audience from the CMS (Priority: P3)

**Goal**: Adding/activating/deactivating a persona and its categories updates every audience-dependent surface without code changes; deletion of referenced personas is refused.

**Independent Test**: quickstart step 5; integration test seeding "Teacher".

### Tests for User Story 5 ⚠️

- [ ] T062 [P] [US5] Integration test `apps/web/tests/integration/personas.int.test.ts` (US5-S1 create Teacher + 2 categories + activate → `getActivePersonas` returns 3 in settings order and `getCategoriesForAudience` includes new ones; US5-S3 deactivate → excluded, linked provider user still readable; US5-S4 delete referenced persona → refused; slug change on update → refused; revalidation tags `personas`/`categories` fired)
- [ ] T063 [P] [US5] Component tests with the three-persona fixture: `Hero.test.tsx` persona selector shows 3 options, `PersonaBand.test.tsx` per-persona and combined layouts interpolate copy, `RegisterForm.test.tsx` provider options = active personas; and `apps/web/tests/unit/seed-copy.test.ts` asserting no seed copy contains unknown placeholders
- [ ] T064 [P] [US5] E2E `apps/web/tests/e2e/us5-personas.spec.ts` tagged `@persona` (admin creates Teacher + categories, activates, publishes → `/` selector, specialties, persona band and `/register` show Teacher; deactivate Photographer → gone from `/`; delete Videographer → error toast)

### Implementation for User Story 5

- [ ] T065 [US5] Verify and complete persona-agnostic rendering: audit `web/modules/**/components` for literal profession names (grep `photograph|videograph|shooter`) and move any into CMS copy with placeholders; make `PersonaSelector` and `PersonaSelect` hide themselves when no persona is active
- [ ] T066 [US5] Finalise `beforeDelete` guards and the admin error message text in `Personas.ts`/`Categories.ts`; add `admin.components.beforeList` note on Personas explaining activation via Site Settings

**Checkpoint**: US5 tests green; manual walkthrough step 5 passes; `grep -ri photograph apps/web/src --include=*.tsx` returns nothing outside seed/fixtures.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Gates, security, deployment shape, docs.

- [ ] T067 [P] Run `pnpm test:coverage`; add tests until app ≥ 80% statements/branches and domain 100% statements; remove dead code revealed by coverage
- [ ] T068 [P] Security pass: `pnpm audit --prod` clean of high/critical; security headers in `next.config.ts` (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, basic CSP allowing self + S3 host + wa.me navigation); confirm no PII in logs (grep for `console.log` of user objects)
- [ ] T069 [P] Add `apps/web/Dockerfile` (multi-stage, Next standalone, non-root user) and `docker-compose.prod.yml` (`web` ×2 + `mongo`); document and run the FR-033 check from quickstart (two instances, login on one, `/account` on the other)
- [ ] T070 [P] Docs: finalise `README.md`, `CLAUDE.md`, `apps/web/.env.example`; update `research.md` open items with what was confirmed in T005/T002
- [ ] T071 Run the full `quickstart.md` walkthrough and the complete Playwright suite (`pnpm test:e2e` without tag filter) on mobile and desktop; fix findings
- [ ] T072 Run `/speckit-analyze` and resolve any spec/plan/tasks inconsistencies; tick all tasks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately; T002 before T005/T007/T008/T009; T003/T004 parallel with T002
- **Foundational (Phase 2)**: after Phase 1; domain tasks T012–T015 and helpers T016–T020 run in parallel; T021 after T008; T022–T026 after T012–T020; T027 after T022–T026; T028 after T027; T029 after T027; T030–T032 parallel after T027
- **User stories (Phases 3–7)**: all after Phase 2; recommended order US1 → US2 → US3 → US4 → US5; US2 touches Hero (US1) so run after US1; US3–US5 are independent of each other but US5 e2e assumes US4's register page exists
- **Polish (Phase 8)**: after all stories

### User Story Dependencies

- **US1 (P1)**: Foundational only
- **US2 (P1)**: Foundational + Hero/CTA slots from US1 (T039, T040)
- **US3 (P2)**: Foundational + landing queries (T037); e2e assumes US1 renders sections
- **US4 (P2)**: Foundational only (forms + routes); Header links touch T042
- **US5 (P3)**: Foundational + persona-aware components from US1 (T039, T040) and the register form from US4 (T059) for the full check

### Within Each User Story

- Tests first (component, integration, e2e), confirmed failing
- Queries → components → pages/routes → wiring
- Lighthouse/axe re-run before the checkpoint

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
3. Phase 4 US2 → the site converts via WhatsApp. **Deployable MVP.**

### Incremental Delivery

4. Phase 5 US3 → the owner edits content and the number themselves.
5. Phase 6 US4 → accounts.
6. Phase 7 US5 → audience switch proven end-to-end.
7. Phase 8 → gates, Docker, docs, `/speckit-analyze`.

### Notes

- Keep `payload-types.ts` regenerated after every schema task (T022–T027, T051).
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
| FR-032 one-command seed | T029 |
| FR-033 stateless, horizontally scalable | T005, T069 |
