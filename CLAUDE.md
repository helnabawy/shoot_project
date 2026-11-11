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
Feature 001 is `specs/001-landing-auth-cms/` (planned, 106 tasks, T001–T107; T094 unused). Feature 002
is `specs/002-creator-profiles/` (creator profiles and directory: `/creators`, `/creators/{code}`,
`/book/{code}`, `/work/{specialty}`, the provider editor at `/account/profile`; module
`apps/web/src/modules/creators/`, rules in `packages/domain/src/creators/`, test-id prefix `CP-`;
implemented on this branch, open items in its `tasks.md`). Feature 005 is
`specs/005-marketing-pages/` (editor-built pages, versioned legal documents, guides with RSS, `/hire/…`
intent pages, not-found/removed: modules `apps/web/src/modules/{pages,legal,guides}/`, rules in
`packages/domain/src/pages/`, test-id prefix `MP-`; implemented on this branch, open items in its
`tasks.md`).
Feature 003 is `specs/003-quick-match-booking/`
(Quick Match steps 2–4 and bookings: `/match/{ref}/{key}` (step 2), `/match/{ref}/{key}/details`
(step 3), `/q/{ref}/{key}` (quotation + booking status, print layout), `/account/bookings`,
`/account/availability`, cron `/api/cron/bookings`; modules `apps/web/src/modules/booking/` and
`apps/web/src/modules/pricing/` (the price-rule core 004 builds on), rules in
`packages/domain/src/booking/` and `packages/domain/src/pricing/`, test-id prefix `QM-`; no payment
provider: payments are recorded by an admin). The shootix.ae feature map and the draft for 004 are in
`specs/ROADMAP.md`. Feature 006 is `specs/006-mobile-accent-colour/` (Flutter app `apps/mobile`: a
per-device accent choice from five curated accents, Blue default, in an Appearance sheet; accent, theme
mode and language saved with `shared_preferences`; primary actions get a fixed `primary` red; test-id
prefix `MA-`; implemented on this branch; open in its `tasks.md`: the rest of the device walkthrough T033: iPad, Android, VoiceOver / TalkBack).

Features 007–015 build the whole Flutter app from the approved design canvas (40 screens at 360 px,
imported into `specs/design-system/canvas/` with `manifest.json`), pixel-perfect, after 006 lands.
None is implemented. 007, 008 and 009 are planned (spec, plan, research, data model, contracts,
quickstart, tasks: 73, 95 and 93 tasks); 010–015 are draft specs (plan and tasks when next).
`specs/ROADMAP.md` has the screens per feature:

| # | Feature (test-id prefix) | What |
|---|---|---|
| 007 | `mobile-foundation` (`MF-`) | type scale, scene/shadow/gradient tokens, the `core/widgets/` catalogue, motion, shell, the pixel-diff pipeline (`tools/design-fidelity/`, goldens, `pnpm fidelity`); screens 37, 39 |
| 008 | `mobile-api` (`MR-`) | `/api/mobile/v1`: `defineHandler`, problem+json errors, read endpoints, `resolve`, contracts, `.well-known` deep-link files |
| 009 | `otp-sign-in` (`OT-`) | sign-in by mobile number + one-time code, Bearer tokens, `/me`, phone identity migration; screens 20–23 |
| 010 | `first-visit-landing` (`ML-`) | splash, learning steps, landing, menu; screens 01–06 |
| 011 | `mobile-creators` (`MC-`) | directory, profile, booking a creator; screens 15–19 |
| 012 | `mobile-quick-match` (`MQ-`) | Quick Match and quotation, booking commands extracted from `booking/actions.ts`; screens 07–14, 40 |
| 013 | `client-account` (`MK-`) | client account and bookings; screens 24–26 |
| 014 | `creator-account` (`MW-`) | creator account, profile, review, availability, assignments; screens 27–32 |
| 015 | `mobile-content` (`MG-`) | guides, pages, legal, removed; screens 33–36, 38 (can run alongside 010–014 once 008 exists) |

Order: 006, 007, 008, 009, then 010–014, with 015 in parallel.

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
- `apps/mobile`: Flutter (stable, SDK pinned in its README) + Dart, iOS (iPhone and iPad) and
  Android, outside the pnpm workspace; cubits (`flutter_bloc`), `get_it`, ARB strings (en, ar),
  exact-pinned packages; tests with `flutter_test`, `bloc_test`, `mocktail` (unit, cubit, widget,
  80 % coverage of changed code). Checks: `dart format`, `flutter analyze`, `flutter test` in
  `apps/mobile`. Constitution 1.4.0. Planned (007–009): golden tests on Linux via
  `apps/mobile/tool/goldens.sh`, the pixel diff against the canvas (`pnpm fidelity`), and the app's
  versioned REST API `/api/mobile/v1` with OTP sign-in and Bearer tokens.

## Project skills (in `.claude/skills/`) — use them

- `payload-cms` — any collection/global/block/access/hook/seed/auth change.
- `nextjs-frontend` — any page, component, style, performance or responsive work.
- `testing-strategy` — before writing any test or starting any task.
- `ui-design` + `impeccable` (impeccable is a user-level skill in
  `~/.claude/skills/impeccable`, not vendored here) — before any visible change: the chosen world
  ("The Brief Bar"), tokens, components, client-flow rules, and the
  impeccable gates (craft floor, detector, finish review, DESIGN.md).
- `persona-extensibility` — anything that names or lists a profession/audience (on the app, labels
  come only from the API, never from ARB).
- `flutter-mobile` — any change in `apps/mobile`: layers, the add-a-feature recipe, the widget
  catalogue and board-class map, CSS-to-Flutter rules, motion tiers and the 5 s cap, session,
  routing, images, the package policy.
- `design-fidelity` — any app screen, widget or golden, and any canvas re-export: the manifest,
  derived dark/Arabic references, fonts, thresholds, the geometry gate, `pnpm fidelity`.
- `mobile-api-contract` — any `/api/mobile/v1` endpoint, request/response shape, error code, token
  or OTP flow, command extracted from a server action, or Dart model.
- `speckit-*` — the workflow commands above.

The three mobile skills describe planned work (features 007–015); each feature's `plan.md` wins
where they differ.

## Non-negotiables (from the constitution)

- Tests first; every acceptance scenario maps to a test named with its FR/US id.
- Performance budgets are requirements: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, landing JS ≤ 200 KB.
- Copy, contact numbers, audience lists and the brief builder's sentence and
  options (`option-sets`) are CMS data, never code constants.
- Every collection/global declares explicit access; default deny.
- Simple client flow, designed not generated (Principle IX): one primary
  action per screen, brief without an account, no invented proof, no
  template tells; `PRODUCT.md` and `.impeccable/surfaces/` are the design
  authority. For app screens the canvas boards in `specs/design-system/canvas/` are the authority,
  proven by the pixel diff; references are never updated from Flutter output.
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
pnpm check:scenarios              # every quickstart scenario has a test named with its CP-/MP-/QM-/MA-/M… id
pnpm test:coverage                # domain 100 %, app >= 80 %
pnpm build && pnpm test:e2e       # or BASE_URL=http://localhost:3100 against a running server
pnpm db:migration:create <name>   # after any schema change; CI fails on drift

# Mobile (in apps/mobile)
dart format --set-exit-if-changed lib test
flutter analyze                   # no issues
flutter test --coverage           # >= 80 % of changed lines
tool/goldens.sh                   # planned (007): golden tests in Docker (Linux only); --update rewrites the app's goldens
# Back at the root
pnpm fidelity                     # planned (007): every app golden vs the Playwright render of its canvas board
```

Every Bash call needs Node 24 on PATH (`nvm use`); integration tests and `goldens.sh` need Docker.

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
