# Implementation Plan: Landing Page, Member Accounts and CMS-Managed Content

**Branch**: `001-landing-auth-cms` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-landing-auth-cms/spec.md`

## Summary

Ship one deployable web application that serves a fast, single-scroll landing
page ("You brief. We shoot."), WhatsApp calls to action, member registration
and login, and a CMS in which the owner edits every landing section, the
WhatsApp number and the target audience (personas and categories). The
technical approach is **Next.js 16 (App Router, React) with Payload CMS 3.93.x
embedded in the same app, backed by PostgreSQL**, organised as a pnpm monorepo
with a framework-free `packages/domain` for business rules. Public pages are
server-rendered and cached by tag; Payload hooks revalidate tags on publish,
so CMS changes are live within seconds without a rebuild. Tests run at four
levels (unit, component, integration against a throwaway PostgreSQL container, Playwright
end-to-end) with Lighthouse CI enforcing the performance budgets.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node.js 24 LTS (Payload 3.93.x engines: `^22.23.4 || >=24.22.1`)

**Primary Dependencies**: Next.js 16.4.x, React 19.x, Payload 3.93.x (`payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/translations`, `@payloadcms/ui` for small admin components, `@payloadcms/storage-s3` for production media), Tailwind CSS 4.3.x, zod, sharp, next-intl 4.14.x (locale routing + UI strings), next-themes 0.4.x (theme persistence, no-flash), `@next/bundle-analyzer` (dev, `pnpm --filter web analyze`). All Payload/Next/React versions pinned exactly and identical across the workspace.

**Storage**: PostgreSQL 17 (Docker Compose locally; managed PostgreSQL in production) through Payload's Postgres adapter (Drizzle), schema changes shipped as committed migrations. Media on local disk in development, S3-compatible object storage in production.

**Testing**: Vitest 4.0.x (unit; component with jsdom + React Testing Library; integration against a PostgreSQL container started by Testcontainers), Playwright 1.63 (+ `@axe-core/playwright`), Lighthouse CI 0.16. (Planned as Vitest 5 / Playwright 1.65; kept at the template's versions, see research.md "Confirmed during implementation".)

**Target Platform**: Linux container (Next.js standalone output) behind a load balancer; browsers: last 2 evergreen versions + iOS Safari ≥ 16.

**Project Type**: Web application — pnpm monorepo with one Next.js app (`apps/web`) and shared packages (`packages/domain`, `packages/config`).

**Performance Goals**: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, TTFB ≤ 800 ms on mobile/4G emulation; Lighthouse Performance ≥ 90 and Accessibility ≥ 95; landing-page JS ≤ 200 KB compressed, total weight ≤ 1.5 MB.

**Constraints**: Stateless app instances (JWT cookie sessions, external media storage); published CMS changes visible ≤ 60 s; WCAG 2.1 AA in both themes; English (LTR, root URLs) and Arabic (RTL, `/ar`) with English fallback for untranslated content; theme applied before first paint; forms and WhatsApp links work without JavaScript; no audience name hardcoded in code; secrets only via validated environment variables.

**Scale/Scope**: MVP: 4 site routes (`/`, `/login`, `/register`, `/account`) × 2 locales plus `/admin`; utility routes `/next/preview`, `/next/exit-preview`, `/api/health`, `/api/cron/cleanup`, sitemap and robots; 2 globals, 7 collections (users, media, personas, categories, option-sets, briefs, rate-limits), 8 block types, a 6-slot brief builder with 4 seeded option sets, 2 seeded personas + 6 categories, 2 message files, 2 themes. Designed for tens of thousands of monthly visitors and thousands of member accounts per instance, horizontally scalable.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven | Spec exists, validated, no clarification markers; plan references spec IDs | PASS — `spec.md` + `checklists/requirements.md` all green |
| II. Performance budgets | Budgets encoded in `lighthouserc.json`; CI asserts on PRs; landing page is cached server render | PASS by design — T010 adds Lighthouse CI (dark collection T091); rendering strategy in research §4 |
| III. Test-first | Every acceptance scenario mapped to a test layer; coverage gates configured | PASS by design — mapping table in `quickstart.md`; tasks list tests before implementation in every story |
| IV. Content in CMS | All copy, numbers and audience lists modelled as globals/collections; placeholders for persona names | PASS — `data-model.md`; persona-extensibility skill |
| V. Modular monolith | One app; `packages/domain` framework-free; feature modules; stateless | PASS — structure below; S3 media in prod; no in-process state |
| VI. Responsive, accessible, bilingual, themed | Viewport checks and axe in e2e for en/ar and light/dark; logical CSS; no-flash theme | PASS by design — Playwright projects `ar-mobile` and `dark`; Lighthouse on `/` and `/ar` |
| VII. Secure by default | Explicit access on every collection/global; built-in auth with lockout; env validation; no raw HTML | PASS — access functions in `data-model.md`; `env.ts` with zod |
| VIII. Simplicity | Additions justified in Complexity Tracking | PASS — see table below (6 justified items) |
| IX. Designed, not generated | UI tasks follow the `ui-design` skill + impeccable; finish review `ship`; DESIGN.md written | PASS by design — T102–T106, research §16 |

**Post-Phase-1 re-check (2026-11-06)**: no new violations introduced by the
data model or contracts. `packages/ui` deliberately not created (single
consumer). Turborepo deferred (plain pnpm scripts suffice for 3 workspaces).

**Amendment re-check (2026-11-06, constitution 1.1.0)**: bilingual and theme
requirements add two small dependencies (next-intl, next-themes), justified
below; localisation is leaf-level so the content model stays shared; all
gates still pass.

**Principle IX re-check (2026-11-07, constitution 1.2.x)**: the visual
direction and design gates (research §16) add no dependencies; all gates
pass.

**Database change (2026-11-07, constitution 1.3.0)**: MongoDB replaced by
PostgreSQL before any code existed (research §17); gates unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-landing-auth-cms/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, rationale, alternatives
├── data-model.md        # Phase 1: collections, globals, blocks, access, validation
├── quickstart.md        # Phase 1: setup + validation scenarios per user story
├── contracts/
│   ├── rest-api.md      # Payload REST endpoints the site and future clients rely on
│   └── routes-and-actions.md  # Public routes, server actions, cache tags, test ids
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/                              # Next.js 16 + Payload 3 (site, admin, API)
├── src/
│   ├── app/
│   │   ├── (payload)/                 # generated by create-payload-app: /admin, /api — do not edit
│   │   ├── (site)/
│   │   │   ├── globals.css            # Tailwind v4 @import, token roles (:root light, .dark), @theme inline
│   │   │   ├── sitemap.ts             # both locales with alternates
│   │   │   ├── robots.ts
│   │   │   └── [locale]/              # 'en' (served at /) and 'ar' (served at /ar)
│   │   │       ├── layout.tsx         # <html lang dir>, system UI font stack, ThemeProvider, NextIntlClientProvider, header/footer/WhatsApp
│   │   │       ├── page.tsx           # landing: Hero (brief builder) + RenderBlocks
│   │   │       ├── login/page.tsx
│   │   │       ├── register/page.tsx
│   │   │       ├── account/layout.tsx # auth guard
│   │   │       ├── account/page.tsx   # details, my briefs, logout
│   │   │       └── not-found.tsx
│   │   ├── api/health/route.ts        # DB ping for load balancers
│   │   ├── api/cron/cleanup/route.ts  # deletes expired rate-limit rows; requires CRON_SECRET
│   │   ├── next/preview/route.ts      # enables draftMode for editors
│   │   └── next/exit-preview/route.ts
│   ├── proxy.ts                       # next-intl createMiddleware(routing) (Next 16 file name)
│   ├── i18n/{routing,request,navigation}.ts   # next-intl config
│   ├── payload.config.ts              # composes modules; postgresAdapter, editor, storage, admin.user, localization, i18n
│   ├── payload-types.ts               # generated
│   ├── migrations/                    # generated by `payload migrate:create`, committed
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── collections/Users.ts
│   │   │   ├── actions.ts             # register, login, logout (server actions)
│   │   │   ├── session.ts             # getCurrentUser(), requireUser()
│   │   │   ├── components/{LoginForm,RegisterForm,AccountSummary}.tsx
│   │   │   └── index.ts
│   │   ├── media/collections/Media.ts
│   │   ├── brief/
│   │   │   ├── collections/{OptionSets,Briefs,RateLimits}.ts
│   │   │   ├── queries.ts             # getBriefBuilderConfig(locale), getMyBriefs(user)
│   │   │   ├── actions.ts             # submitBrief (server action)
│   │   │   ├── components/{BriefBuilder,BriefSuccess,MyBriefs}.tsx
│   │   │   └── index.ts
│   │   ├── personas/
│   │   │   ├── collections/{Personas,Categories}.ts
│   │   │   ├── queries.ts             # getActivePersonas(), getCategoriesForAudience()
│   │   │   ├── components/PersonaSelect.tsx   # registration professional-type select
│   │   │   └── index.ts
│   │   ├── landing/
│   │   │   ├── globals/LandingPage.ts # hero, briefBuilder, navigation, sections, seo
│   │   │   ├── blocks/{HowItWorks,Features,CategoriesGrid,PersonaBand,Faq,LogoCloud,RichTextBlock,CallToAction}.ts
│   │   │   ├── queries.ts             # getLandingPage({ locale, draft })
│   │   │   ├── components/Hero.tsx
│   │   │   ├── components/RenderBlocks.tsx
│   │   │   ├── components/sections/*.tsx   # one per block
│   │   │   └── index.ts
│   │   ├── site-settings/
│   │   │   ├── globals/SiteSettings.ts
│   │   │   ├── components/ActivePersonasWarning.tsx
│   │   │   ├── queries.ts             # getSiteSettings({ locale })
│   │   │   └── index.ts
│   │   └── contact/components/{WhatsAppButton,FloatingWhatsApp}.tsx
│   └── shared/
│       ├── payload/access.ts          # anyone, authenticated, isAdmin, isEditor, isAdminOrSelf
│       ├── payload/hooks/revalidate.ts
│       ├── payload/fields/{slug,cta}.ts
│       ├── payload/{localization.ts,context.d.ts}
│       ├── payload/seed/{index,admin,personas,categories,option-sets,site-settings,landing-page}.ts
│       ├── lib/{payload,cache,env,locale}.ts
│       ├── theme/{ThemeProvider,ThemeToggle}.tsx
│       ├── i18n/LocaleSwitcher.tsx
│       ├── components/{Header,Footer,MobileMenu,ActiveSection,CmsImage,CtaLink,ExitPreviewBar}.tsx
│       ├── ui/{Button,Container,Section,Input,Field,FormError,Bidi}.tsx
│       └── ui/bar/{BriefBar,BarField,ResultGroup,ResultRow,TopHit,GlyphTile,KeyHint}.tsx, motion.ts
├── messages/{en,ar}.json              # static UI strings (FR-039)
├── tests/
│   ├── setup/{component.ts,render.tsx}
│   ├── fixtures/{personas,categories,site-settings,landing,option-sets,brief-builder}.ts
│   ├── unit/{messages,contrast,seed-copy}.test.ts
│   ├── integration/setup/{global-setup,payload}.ts
│   ├── integration/*.int.test.ts
│   └── e2e/{us1-landing,us2-whatsapp,us3-cms,us4-auth,us5-personas,us6-i18n,us7-theme,us8-brief,api}.spec.ts, fixtures/member.ts
├── next.config.ts                     # withPayload, next-intl plugin, images, output: 'standalone'
├── vitest.config.ts                   # projects: unit, component, integration
├── playwright.config.ts               # projects: mobile, desktop, nojs, ar-mobile, dark
├── Dockerfile                         # multi-stage, Next standalone, non-root
├── .env.example
└── package.json

packages/domain/                       # framework-free business rules (100% covered)
├── src/
│   ├── auth/{schemas.ts,schemas.test.ts}
│   ├── contact/{whatsapp.ts,whatsapp.test.ts}       # normaliseE164, buildWhatsAppLink
│   ├── brief/{sentence.ts,options.ts,schema.ts,message.ts,fingerprint.ts,reference.ts,*.test.ts}
│   ├── personas/{types.ts,resolve.ts,interpolate.ts,conjunctions.ts,*.test.ts}
│   ├── content/{placeholders.ts,placeholders.test.ts}
│   └── index.ts
├── vitest.config.ts
└── package.json

packages/config/                       # shared tsconfig.base.json, eslint.config.js, prettier.config.js

scripts/check-logical-css.sh           # fails on physical left/right utilities (RTL)
docker-compose.yml                     # postgres service for dev + e2e
docker-compose.prod.yml                # web ×2 + postgres (FR-033 check)
lighthouserc.json                      # performance budgets (light + dark, en + ar)
.github/workflows/ci.yml               # typecheck, lint, test, migrations check, e2e smoke, lhci
pnpm-workspace.yaml, package.json, .nvmrc
```

**Structure Decision**: Web application as a pnpm monorepo with one deployable
(`apps/web`) that hosts the public site, the Payload admin and the API, plus
`packages/domain` (pure TypeScript rules shared by CMS validation, server
actions, components and tests) and `packages/config` (tooling). Feature
modules under `apps/web/src/modules/` own their schema, UI, queries, actions
and tests. This satisfies Principle V (one deployable, explicit boundaries,
splittable later) without creating packages that have a single consumer.

## Key Design Decisions (summary of research.md)

1. **React/Next.js over Angular** because Payload 3 is a Next.js-native
   application; Angular would force a second deployable and client-side
   rendering of the landing page.
2. **Rendering**: landing, login and register pages are server-rendered and
   cached per locale with tags (`landing-page`, `site-settings`, `personas`,
   `categories`, `option-sets`, `media`); Payload `afterChange`/`afterDelete`
   hooks call `revalidateTag(tag, 'max')`. Client-side navigation via the
   next-intl `Link` provides the single-page feel. `account/*` is dynamic
   (reads the cookie).
3. **Landing page as a Global with drafts** (not a Pages collection): there
   is exactly one landing page; drafts + `draftMode()` preview route cover
   FR-013/FR-015. A Pages collection arrives with feature 005.
4. **Auth**: Payload built-in local strategy; cookie `payload-token`
   (HTTP-only, SameSite=Lax, Secure in prod); `maxLoginAttempts: 5`,
   `lockTime: 15 min`; server actions wrap `payload.create`/`payload.login`;
   role field with field-level access prevents escalation; admin panel for
   `admin` and `editor` roles.
5. **Persona model**: `personas` and `categories` collections,
   `site-settings.activePersonas` ordered relationship, placeholder
   interpolation in `packages/domain`; no slug-specific branches in code.
6. **Testing**: Vitest projects (unit/component/integration);
   a Testcontainers PostgreSQL with committed migrations for integration;
   Playwright against a production build with a migrated, seeded Docker
   PostgreSQL; axe on public pages; Lighthouse CI budgets as PR gate.
7. **Styling**: Tailwind v4 with token roles (`--ground`, `--ink`,
   `--panel`, `--panel-action`, `--arrow`, `--attention`, see the
   `ui-design` skill) in `globals.css`, scoped to the `(site)` route group so
   the Payload admin is untouched; one value per theme (`:root` / `.dark`);
   logical properties only, so RTL needs no overrides.
8. **Localisation** (research §13): Payload locales `en`/`ar` with English
   fallback and leaf-level `localized` fields; next-intl for `/`-vs-`/ar`
   routing, negotiation, cookie and UI strings; admin UI translated via
   `@payloadcms/translations`.
9. **Theme** (research §14): token-driven light/dark with next-themes
   (system default, toggle, no flash); Payload admin keeps its built-in
   light/dark/auto preference.
10. **Brief builder** (research §15): localised sentence template with slot
    definitions bound to a generic `option-sets` collection (per-option
    persona filter); submission records a `briefs` lead with a short
    reference (dedupe in the server action; honeypot and per-visitor limit
    in a `briefs` hook so REST is covered too) and opens WhatsApp; stable
    brief id for feature 003.
11. **Visual direction** (research §16): The Brief Bar (Spotlight / Quick
    Actions grammar), the system UI font stack (no font files), bar
    component kit in `shared/ui/bar/`; every UI
    task follows the `ui-design` skill and the impeccable gates.
12. **Database** (research §17): PostgreSQL 17 via Payload's Postgres
    adapter, committed migrations, Testcontainers in tests; expired
    rate-limit rows removed by a protected cron route.
13. **Deployment shape**: `output: 'standalone'` Docker image; any container
    platform or Vercel; `payload migrate` runs as a release step; S3-compatible
    media in production keeps instances stateless.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `@testcontainers/postgresql` (dev dependency, needs Docker) | Integration tests for access rules, hooks, auth and migrations must run against a real PostgreSQL on every `pnpm test` and in CI, isolated from dev data | Pointing Vitest at the `.env` database (Payload template default) pollutes dev data and couples tests to a hand-started service; an in-process Postgres emulation is not an officially supported Payload adapter |
| Monorepo (3 workspaces) instead of a single Next.js app | Principle V requires framework-free domain rules and a layout that can host a second app (mobile, separate API) without a rewrite; shared tooling config avoids drift | A single app with a `lib/domain` folder cannot be consumed by a future second app without extraction, and nothing enforces the "no framework imports" rule; the cost of two tiny packages is small |
| `zod` alongside Payload's own field validation | One schema per form (register, login, WhatsApp number) shared by server actions, Payload `validate` functions, component tests and the domain package; Payload validation alone cannot be reused in the domain package or in forms before submission | Duplicating rules in Payload fields and in server actions guarantees drift between what the admin accepts and what the public form accepts |
| `next-intl` (locale routing + messages) | FR-034–FR-039 need locale-prefixed routes, `Accept-Language` negotiation, a persistent cookie, locale-aware links/redirects, ICU plural rules and typed message keys | A hand-rolled `proxy.ts` + JSON dictionaries re-implements negotiation, plural handling and typed keys with its own bugs and tests; next-intl is small (~10 KB) and the standard App Router solution |
| `rate-limits` collection + `/api/cron/cleanup` route | FR-050 anonymous brief throttling must hold across two instances (Principle V) | In-memory counters reset per instance and let a bot round-robin; a Redis dependency is heavier than one small table |
| `next-themes` (theme persistence + no-flash) | FR-042 requires the correct theme on first paint, system sync and persistence across pages | A hand-written inline script and React context is the same amount of code with less battle-testing; `prefers-color-scheme`-only cannot honour a user override |
