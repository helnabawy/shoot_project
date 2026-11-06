# Shoot Project — guidance for Claude Code

A fast, responsive, single-page-feel marketing site with member accounts and
a CMS, inspired by shootix.ae. Hero: "You brief. We shoot." The site brokers
professionals (today photographers and videographers; tomorrow any persona,
e.g. teachers) to people who need them, and converts via WhatsApp.

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
Feature 001 is `specs/001-landing-auth-cms/`.

## Stack (binding, see constitution "Technology Stack & Constraints")

- TypeScript strict, Node 24 LTS (`.nvmrc`), pnpm workspaces. Exact-pinned
  versions of payload / @payloadcms/* / next / react across the workspace.
- `apps/web`: Next.js 16 App Router + React + Payload CMS 3.9x (admin at
  `/admin`, REST at `/api`, Local API for server reads) + MongoDB. Tailwind
  CSS v4 (tokens in CSS `@theme`). Next 16 notes: `proxy.ts` not
  `middleware.ts`; `cookies()`/`headers()`/`params` are async;
  `revalidateTag(tag, 'max')` takes two arguments; lint via `eslint` directly.
- `packages/domain`: framework-free business rules (zod schemas, persona
  resolution, WhatsApp link builder). 100% unit-test coverage.
- `packages/config`: shared tsconfig / eslint / prettier.
- Tests: Vitest (unit, component, integration with in-memory MongoDB),
  Playwright (e2e), Lighthouse CI (performance budgets).

## Project skills (in `.claude/skills/`) — use them

- `payload-cms` — any collection/global/block/access/hook/seed/auth change.
- `nextjs-frontend` — any page, component, style, performance or responsive work.
- `testing-strategy` — before writing any test or starting any task.
- `persona-extensibility` — anything that names or lists a profession/audience.
- `speckit-*` — the workflow commands above.

## Non-negotiables (from the constitution)

- Tests first; every acceptance scenario maps to a test named with its FR/US id.
- Performance budgets are requirements: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, landing JS ≤ 200 KB.
- Copy, contact numbers and audience lists are CMS data, never code constants.
- Every collection/global declares explicit access; default deny.
- Mobile-first, WCAG 2.1 AA, verified at 360/768/1024/1440 px.
- No new package, service or abstraction without a Complexity Tracking justification in the plan.

## Commands (available after Phase 1 setup tasks)

```bash
pnpm install
docker compose up -d mongo        # local MongoDB
pnpm --filter web dev             # http://localhost:3000, admin at /admin
pnpm --filter web seed            # default content + admin from .env
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e
```

## Conventions

- Conventional Commits; one feature branch per spec (`001-landing-auth-cms`).
- Module layout in `apps/web/src/modules/<feature>/` (collections, globals,
  blocks, components, queries, actions, tests). Cross-module imports only via
  the module's `index.ts`.
- Regenerate `payload-types.ts` after any schema change
  (`pnpm --filter web payload generate:types`); never edit it by hand.
- Secrets only in `.env` (git-ignored); `.env.example` documents every variable.
