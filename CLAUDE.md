# Shoot Project — guidance for Claude Code

A fast, responsive, single-page-feel marketing site with member accounts and
a CMS, inspired by shootix.ae. Hero: "You brief. We shoot." The site brokers
professionals (today photographers and videographers; tomorrow any persona,
e.g. teachers) to people who need them, and converts via WhatsApp. It is
bilingual (English default, Arabic RTL) and themed (light/dark) on both the
public site and the Payload admin.

## How work happens here: Spec-Driven Development

This repo uses GitHub Spec Kit. Nothing is implemented without a spec and a
task list. The commands, in order:

1. `/speckit-constitution` — principles live in `.specify/memory/constitution.md` (read it first; it is binding).
2. `/speckit-specify <description>` — writes `specs/NNN-name/spec.md` (WHAT and WHY, no tech).
3. `/speckit-clarify` — optional, de-risks ambiguous specs.
4. `/speckit-plan` — writes `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
5. `/speckit-tasks` — writes `tasks.md` (dependency-ordered, grouped by user story).
6. `/speckit-analyze` — consistency check across spec/plan/tasks. Run before implementing.
7. `/speckit-implement` — executes `tasks.md` phase by phase, tests first.

The current feature is recorded in `.specify/feature.json` (git-ignored).
Feature 001 is `specs/001-landing-auth-cms/` (planned, 106 tasks, T001–T107; T094 unused). The
shootix.ae feature map and drafts for 002–005 are in `specs/ROADMAP.md`.

## Stack (binding, see constitution "Technology Stack & Constraints")

- TypeScript strict, Node 24 LTS (`.nvmrc`), pnpm workspaces. Exact-pinned
  versions of payload / @payloadcms/* / next / react across the workspace.
- `apps/web`: Next.js 16 App Router + React 19 + Payload CMS 3.93.x (admin at
  `/admin`, REST at `/api`, Local API for server reads) + PostgreSQL (Payload Postgres adapter, committed migrations). Tailwind
  CSS v4 (token roles in `globals.css`, mapped via `@theme inline`). Next 16 notes: `proxy.ts` not
  `middleware.ts`; `cookies()`/`headers()`/`params` are async;
  `revalidateTag(tag, 'max')` takes two arguments; lint via `eslint` directly.
- `packages/domain`: framework-free business rules (zod schemas, persona
  resolution, WhatsApp link builder). 100% unit-test coverage.
- `packages/config`: shared tsconfig / eslint / prettier.
- i18n: Payload `localization` (en default, ar RTL, English fallback) +
  next-intl 4.14 (`/` and `/ar`); theme: design tokens + next-themes
  (light/dark/system, no flash).
- Tests: Vitest (unit, component, integration against a Testcontainers PostgreSQL),
  Playwright (e2e), Lighthouse CI (performance budgets).

## Project skills (in `.claude/skills/`) — use them

- `payload-cms` — any collection/global/block/access/hook/seed/auth change.
- `nextjs-frontend` — any page, component, style, performance or responsive work.
- `testing-strategy` — before writing any test or starting any task.
- `ui-design` + `impeccable` (impeccable is a user-level skill in
  `~/.claude/skills/impeccable`, not vendored here) — before any visible change: the chosen world
  ("The Brief Bar"), tokens, components, client-flow rules, and the
  impeccable gates (craft floor, detector, finish review, DESIGN.md).
- `persona-extensibility` — anything that names or lists a profession/audience.
- `speckit-*` — the workflow commands above.

## Non-negotiables (from the constitution)

- Tests first; every acceptance scenario maps to a test named with its FR/US id.
- Performance budgets are requirements: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, landing JS ≤ 200 KB.
- Copy, contact numbers, audience lists and the brief builder's sentence and
  options (`option-sets`) are CMS data, never code constants.
- Every collection/global declares explicit access; default deny.
- Simple client flow, designed not generated (Principle IX): one primary
  action per screen, brief without an account, no invented proof, no
  template tells; `PRODUCT.md` and `.impeccable/surfaces/` are the design
  authority.
- Mobile-first, WCAG 2.1 AA, verified at 360/768/1024/1440 px, in English (LTR)
  and Arabic (RTL), in light and dark theme.
- Every user-visible CMS text field is `localized: true` (English fallback);
  static UI strings live in `apps/web/messages/{en,ar}.json`. Use logical
  CSS (start/end), never left/right. Theme via tokens with a `.dark` variant;
  no flash of the wrong theme.
- No new package, service or abstraction without a Complexity Tracking justification in the plan.

## Commands

```bash
pnpm install
docker compose up -d postgres     # local PostgreSQL 17
pnpm db:migrate                   # apply committed migrations
pnpm seed                         # default bilingual content + admin from .env
pnpm dev                          # http://localhost:3000, admin at /admin
pnpm typecheck && pnpm lint && pnpm test
pnpm test:coverage                # domain 100 %, app >= 80 %
pnpm build && pnpm test:e2e       # or BASE_URL=http://localhost:3100 against a running server
pnpm db:migration:create <name>   # after any schema change; CI fails on drift
```

Every Bash call needs Node 24 on PATH (`nvm use`); integration tests need Docker.

## Conventions

- Conventional Commits; one feature branch per spec (`001-landing-auth-cms`).
- Module layout in `apps/web/src/modules/<feature>/` (collections, globals,
  blocks, components, queries, actions, tests). Cross-module imports only via
  the module's `index.ts`.
- Every schema change ends with a committed migration
  (`pnpm --filter web payload migrate:create <name>`), reviewed for data loss.
- Regenerate `payload-types.ts` after any schema change
  (`pnpm --filter web payload generate:types`); never edit it by hand.
- Secrets only in `.env` (git-ignored); `.env.example` documents every variable.
