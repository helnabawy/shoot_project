# Implementation Plan: Landing Page, Member Accounts and CMS-Managed Content

**Branch**: `001-landing-auth-cms` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-landing-auth-cms/spec.md`

## Summary

Ship one deployable web application that serves a fast, single-scroll landing
page ("You brief. We shoot."), WhatsApp calls to action, member registration
and login, and a CMS in which the owner edits every landing section, the
WhatsApp number and the target audience (personas and categories). The
technical approach is **Next.js 16 (App Router, React) with Payload CMS 3.9x
embedded in the same app, backed by MongoDB**, organised as a pnpm monorepo
with a framework-free `packages/domain` for business rules. Public pages are
server-rendered and cached by tag; Payload hooks revalidate tags on publish,
so CMS changes are live within seconds without a rebuild. Tests run at four
levels (unit, component, integration against an in-memory MongoDB, Playwright
end-to-end) with Lighthouse CI enforcing the performance budgets.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node.js 24 LTS (Payload 3.9x engines: `^22.23.4 || >=24.22.1`)

**Primary Dependencies**: Next.js 16.4.x, React 19.x, Payload 3.93.x (`payload`, `@payloadcms/next`, `@payloadcms/db-mongodb`, `@payloadcms/richtext-lexical`, `@payloadcms/storage-s3` for production media), Tailwind CSS 4.3.x, zod, sharp. All Payload/Next/React versions pinned exactly and identical across the workspace.

**Storage**: MongoDB 7+ (Docker Compose locally; managed MongoDB in production). Media on local disk in development, S3-compatible object storage in production.

**Testing**: Vitest 5.x (unit; component with jsdom + React Testing Library; integration with `mongodb-memory-server` replica set), Playwright 1.65 (+ `@axe-core/playwright`), Lighthouse CI 0.16.

**Target Platform**: Linux container (Next.js standalone output) behind a load balancer; browsers: last 2 evergreen versions + iOS Safari ≥ 16.

**Project Type**: Web application — pnpm monorepo with one Next.js app (`apps/web`) and shared packages (`packages/domain`, `packages/config`).

**Performance Goals**: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, TTFB ≤ 800 ms on mobile/4G emulation; Lighthouse Performance ≥ 90 and Accessibility ≥ 95; landing-page JS ≤ 200 KB compressed, total weight ≤ 1.5 MB.

**Constraints**: Stateless app instances (JWT cookie sessions, external media storage); published CMS changes visible ≤ 60 s; WCAG 2.1 AA; forms and WhatsApp links work without JavaScript; no audience name hardcoded in code; secrets only via validated environment variables.

**Scale/Scope**: MVP: 5 public routes (`/`, `/login`, `/register`, `/account`, `/admin`), 2 globals, 4 collections, 8 block types, 2 seeded personas + 6 categories. Designed for tens of thousands of monthly visitors and thousands of member accounts per instance, horizontally scalable.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven | Spec exists, validated, no clarification markers; plan references spec IDs | PASS — `spec.md` + `checklists/requirements.md` all green |
| II. Performance budgets | Budgets encoded in `lighthouserc.json`; CI asserts on PRs; landing page is cached server render | PASS by design — tasks T00x add Lighthouse CI; rendering strategy in research §4 |
| III. Test-first | Every acceptance scenario mapped to a test layer; coverage gates configured | PASS by design — mapping table in `quickstart.md`; tasks list tests before implementation in every story |
| IV. Content in CMS | All copy, numbers and audience lists modelled as globals/collections; placeholders for persona names | PASS — `data-model.md`; persona-extensibility skill |
| V. Modular monolith | One app; `packages/domain` framework-free; feature modules; stateless | PASS — structure below; S3 media in prod; no in-process state |
| VI. Responsive & accessible | Viewport checks and axe in e2e; a11y rules in skills | PASS by design — tasks include axe + 4-width checks |
| VII. Secure by default | Explicit access on every collection/global; built-in auth with lockout; env validation; no raw HTML | PASS — access functions in `data-model.md`; `env.ts` with zod |
| VIII. Simplicity | Additions justified in Complexity Tracking | PASS — see table below (3 justified items) |

**Post-Phase-1 re-check (2026-11-06)**: no new violations introduced by the
data model or contracts. `packages/ui` deliberately not created (single
consumer). Turborepo deferred (plain pnpm scripts suffice for 3 workspaces).

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
│   │   │   ├── layout.tsx             # header, footer, floating WhatsApp button, fonts
│   │   │   ├── page.tsx               # landing: Hero + RenderBlocks
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── account/layout.tsx     # auth guard
│   │   │   ├── account/page.tsx
│   │   │   ├── globals.css            # Tailwind v4 @import + @theme tokens
│   │   │   ├── sitemap.ts
│   │   │   ├── robots.ts
│   │   │   └── not-found.tsx
│   │   ├── next/preview/route.ts      # enables draftMode for editors
│   │   └── next/exit-preview/route.ts
│   ├── payload.config.ts              # composes modules; db, editor, storage, admin.user
│   ├── payload-types.ts               # generated
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── collections/Users.ts
│   │   │   ├── actions.ts             # register, login, logout (server actions)
│   │   │   ├── session.ts             # getCurrentUser(), requireUser()
│   │   │   ├── components/{LoginForm,RegisterForm,AccountSummary}.tsx
│   │   │   └── index.ts
│   │   ├── media/collections/Media.ts
│   │   ├── personas/
│   │   │   ├── collections/{Personas,Categories}.ts
│   │   │   ├── queries.ts             # getActivePersonas(), getCategoriesForAudience()
│   │   │   ├── components/PersonaSelect.tsx
│   │   │   └── index.ts
│   │   ├── landing/
│   │   │   ├── globals/LandingPage.ts
│   │   │   ├── blocks/{HowItWorks,Features,CategoriesGrid,PersonaBand,Faq,LogoCloud,RichTextBlock,CallToAction}.ts
│   │   │   ├── queries.ts             # getLandingPage({ draft })
│   │   │   ├── components/Hero.tsx
│   │   │   ├── components/RenderBlocks.tsx
│   │   │   ├── components/sections/*.tsx   # one per block
│   │   │   └── index.ts
│   │   ├── site-settings/
│   │   │   ├── globals/SiteSettings.ts
│   │   │   ├── queries.ts             # getSiteSettings()
│   │   │   └── index.ts
│   │   └── contact/components/{WhatsAppButton,FloatingWhatsApp}.tsx
│   └── shared/
│       ├── payload/access.ts          # anyone, authenticated, isAdmin, isEditor, isAdminOrSelf
│       ├── payload/hooks/revalidate.ts
│       ├── payload/fields/{slug,seo}.ts
│       ├── payload/seed/{index,personas,categories,site-settings,landing-page,admin}.ts
│       ├── lib/{payload,cache,env}.ts
│       └── ui/{Button,Container,Section,Input,Field,FormError}.tsx
├── tests/
│   ├── setup/component.ts
│   ├── fixtures/{personas,landing,site-settings}.ts
│   ├── integration/setup/{global-setup,payload}.ts
│   ├── integration/*.int.test.ts
│   └── e2e/{us1-landing,us2-whatsapp,us3-cms,us4-auth,us5-personas}.spec.ts
├── next.config.ts                     # withPayload, images, output: 'standalone'
├── vitest.config.ts                   # projects: unit, component, integration
├── playwright.config.ts
├── .env.example
└── package.json

packages/domain/                       # framework-free business rules (100% covered)
├── src/
│   ├── auth/{schemas.ts,schemas.test.ts}
│   ├── contact/{whatsapp.ts,whatsapp.test.ts}       # normaliseE164, buildWhatsAppLink
│   ├── personas/{resolve.ts,interpolate.ts,*.test.ts}
│   ├── content/{placeholders.ts,placeholders.test.ts}
│   └── index.ts
├── vitest.config.ts
└── package.json

packages/config/                       # shared tsconfig.base.json, eslint.config.js, prettier.config.js

docker-compose.yml                     # mongo service for dev + e2e
lighthouserc.json                      # performance budgets
.github/workflows/ci.yml               # typecheck, lint, test, e2e smoke, lhci
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
   cached with tags (`landing-page`, `site-settings`, `personas`,
   `categories`); Payload `afterChange`/`afterDelete` hooks call
   `revalidateTag(tag, 'max')`. Client-side navigation via `next/link`
   provides the single-page feel. `account/*` is dynamic (reads the cookie).
3. **Landing page as a Global with drafts** (not a Pages collection): there
   is exactly one landing page; drafts + `draftMode()` preview route cover
   FR-013/FR-015. A Pages collection can be added later for extra pages.
4. **Auth**: Payload built-in local strategy; cookie `payload-token`
   (HTTP-only, SameSite=Lax, Secure in prod); `maxLoginAttempts: 5`,
   `lockTime: 15 min`; server actions wrap `payload.create`/`payload.login`;
   role field with field-level access prevents escalation.
5. **Persona model**: `personas` and `categories` collections,
   `site-settings.activePersonas` ordered relationship, placeholder
   interpolation in `packages/domain`; no slug-specific branches in code.
6. **Testing**: Vitest projects (unit/component/integration);
   `mongodb-memory-server` replica set for integration; Playwright against a
   production build with a seeded Docker MongoDB; axe on public pages;
   Lighthouse CI budgets as PR gate.
7. **Styling**: Tailwind v4 with `@theme` tokens in `globals.css`, scoped to
   the `(site)` route group so the Payload admin is untouched.
8. **Deployment shape**: `output: 'standalone'` Docker image; any container
   platform or Vercel; S3-compatible media in production keeps instances
   stateless.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `mongodb-memory-server` (extra dev dependency, ~100 MB binary cache) | Integration tests for access rules, hooks and auth must run against a real MongoDB on every `pnpm test` and in CI without external services; Payload's own test suite uses it | Pointing Vitest at the `.env` database (Payload template default) makes `pnpm test` depend on a running Docker service, pollutes dev data, and is slower to isolate per test file |
| Monorepo (3 workspaces) instead of a single Next.js app | Principle V requires framework-free domain rules and a layout that can host a second app (mobile, separate API) without a rewrite; shared tooling config avoids drift | A single app with a `lib/domain` folder cannot be consumed by a future second app without extraction, and nothing enforces the "no framework imports" rule; the cost of two tiny packages is small |
| `zod` alongside Payload's own field validation | One schema per form (register, login, WhatsApp number) shared by server actions, Payload `validate` functions, component tests and the domain package; Payload validation alone cannot be reused in the domain package or in forms before submission | Duplicating rules in Payload fields and in server actions guarantees drift between what the admin accepts and what the public form accepts |
